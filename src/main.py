import json
import os
from datetime import datetime

from crewai import Crew, Agent, Task
from crewai.llms.base_llm import BaseLLM
from crewai.tools import tool
import chromadb
import ollama
import pennylane as qml
try:
    import torch
except ImportError:
    torch = None
from qiskit import QuantumCircuit
from mem0 import Memory
import asyncio
from playwright.async_api import async_playwright
from firecrawl import FirecrawlApp
try:
    from letta import create_client
except ImportError:
    create_client = None
import cognee
from langfuse import Langfuse
import yaml

# Load SOUL
with open('/workspaces/EchoRogue/SOUL.md', 'r') as f:
    SOUL = f.read()

client = None
collection = None
memory = None
letta_client = None
langfuse = None
_cognee_initialized = False

SKILLS_DIR = "/workspaces/EchoRogue/skills_vault"
os.makedirs(SKILLS_DIR, exist_ok=True)
current_user_id = "anonymous"


def initialize_services():
    global client, collection, memory, letta_client, langfuse, _cognee_initialized
    if client is not None:
        return

    client = chromadb.Client()
    collection = client.create_collection("agent_memory")
    memory = Memory()
    if create_client is not None:
        letta_client = create_client()
    else:
        letta_client = None
    if not _cognee_initialized:
        cognee.init()
        _cognee_initialized = True
    langfuse = Langfuse()  # For observability

# Quantum setup
dev = qml.device("default.qubit", wires=4)  # Simulator

@qml.qnode(dev)
def quantum_circuit(params):
    qml.RY(params[0], wires=0)
    qml.RY(params[1], wires=1)
    qml.CNOT(wires=[0, 1])
    return qml.expval(qml.PauliZ(0))

# Quantum layer for optimization
if torch is not None:
    class QuantumLayer(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.params = torch.nn.Parameter(torch.randn(2))

        def forward(self, x):
            result = quantum_circuit(self.params)
            return x + result  # Placeholder integration
else:
    class QuantumLayer:
        def __init__(self, *args, **kwargs):
            raise RuntimeError("Torch is required for QuantumLayer support.")


def _normalize_messages(messages):
    if isinstance(messages, str):
        return [{"role": "user", "content": messages}]
    if isinstance(messages, dict):
        return [{
            "role": messages.get("role", "user"),
            "content": messages.get("content", ""),
        }]
    if isinstance(messages, (list, tuple)):
        normalized = []
        for message in messages:
            if isinstance(message, str):
                normalized.append({"role": "user", "content": message})
            elif isinstance(message, dict):
                normalized.append({
                    "role": message.get("role", "user"),
                    "content": message.get("content", ""),
                })
            else:
                raise ValueError(
                    f"Unsupported message type: {type(message).__name__}. "
                    "Expected string, dict, or list of dicts."
                )
        return normalized
    raise ValueError(
        "Unsupported messages payload. Provide a string, a message dict, or a list of message dicts."
    )


def _flatten_messages(messages):
    normalized = _normalize_messages(messages)
    parts = []
    for message in normalized:
        role = message.get("role", "user")
        content = message.get("content", "")
        parts.append(f"{role.capitalize()}: {content}")
    return "\n".join(parts).strip()


class OllamaLLM(BaseLLM):
    llm_type: str = "ollama"
    provider: str = "ollama"

    def call(
        self,
        messages,
        tools=None,
        callbacks=None,
        available_functions=None,
        from_task=None,
        from_agent=None,
        response_model=None,
    ):
        normalized = _normalize_messages(messages)
        options = self.additional_params.get("options")
        try:
            response = ollama.chat(
                model=self.model,
                messages=normalized,
                options=options,
            )
        except Exception as exc:
            raise RuntimeError(f"Ollama model call failed: {exc}") from exc

        if hasattr(response, "message") and response.message is not None:
            return getattr(response.message, "content", str(response.message))
        if hasattr(response, "content"):
            return str(response.content)
        return str(response)


class HuggingFaceHubLLM(BaseLLM):
    llm_type: str = "huggingface"
    provider: str = "huggingface"
    hf_provider: str | None = None
    api_token: str | None = None

    def __init__(self, **data):
        if "api_token" not in data:
            data["api_token"] = (
                os.environ.get("HUGGINGFACEHUB_API_TOKEN")
                or os.environ.get("HF_API_TOKEN")
            )
        if not data.get("api_token"):
            raise RuntimeError(
                "HuggingFace model support requires HUGGINGFACEHUB_API_TOKEN or HF_API_TOKEN."
            )

        super().__init__(**data)

        try:
            from huggingface_hub import InferenceClient
        except ImportError as exc:
            raise RuntimeError(
                "huggingface_hub is required for HuggingFace/NVIDIA model support. "
                "Install it with `pip install huggingface_hub`."
            ) from exc

        self.client = InferenceClient(
            model=self.model,
            provider=self.hf_provider or "hf-inference",
            api_key=self.api_token,
        )

    def call(
        self,
        messages,
        tools=None,
        callbacks=None,
        available_functions=None,
        from_task=None,
        from_agent=None,
        response_model=None,
    ):
        prompt = _flatten_messages(messages)
        kwargs = {}
        if self.temperature is not None:
            kwargs["temperature"] = self.temperature
        if self.stop:
            kwargs["stop_sequences"] = self.stop

        response = self.client.text_generation(prompt, **kwargs)

        if isinstance(response, str):
            return response
        if hasattr(response, "generated_text"):
            return response.generated_text
        if isinstance(response, dict) and "generated_text" in response:
            return response["generated_text"]
        if isinstance(response, (list, tuple)):
            return "".join(str(item) for item in response)
        return str(response)


# Multi-model routing (simplified)
def load_model(provider=None, model_name=None):
    provider = (provider or os.environ.get("MODEL_PROVIDER", "ollama")).strip().lower()
    model_name = model_name or os.environ.get("MODEL_NAME")

    if provider in ("ollama", "ollama.ai"):
        return OllamaLLM(model=model_name or "llama2")
    if provider in ("openai", "gpt", "openai_api"):
        return {"llm_type": "openai", "model": model_name or "gpt-4"}
    if provider in ("anthropic", "claude"):
        return {"llm_type": "anthropic", "model": model_name or "claude-3-sonnet-20240229"}
    if provider in ("huggingface", "huggingfacehub", "hf"):
        return HuggingFaceHubLLM(
            model=model_name or "gpt2",
            hf_provider="hf-inference",
        )
    if provider in ("nvidia", "nvidiaai"):
        if not model_name:
            raise ValueError(
                "NVIDIA model provider requires MODEL_NAME to be set for the target model."
            )
        return HuggingFaceHubLLM(
            model=model_name,
            hf_provider="nvidia",
        )

    raise ValueError(f"Unsupported model provider: {provider}")


def route_model(task_type):
    task_type = task_type.strip().lower()
    provider = os.environ.get("MODEL_PROVIDER")
    model_name = os.environ.get("MODEL_NAME")

    if provider or model_name:
        return load_model(provider=provider, model_name=model_name)

    if "quantum" in task_type:
        return load_model(provider="ollama", model_name="llama2")
    elif "creative" in task_type:
        return load_model(provider="anthropic", model_name="claude-3-sonnet-20240229")
    elif "analytical" in task_type:
        return load_model(provider="openai", model_name="gpt-4")
    else:
        return load_model(provider="ollama", model_name="llama2")

# Tools
def run_code(code):
    """Run code in a sandboxed environment."""
    # Placeholder for sandbox execution
    # Use E2B or Docker
    return "Code executed successfully"  # Simulate

def search_docs(query):
    """Search documentation for the provided query."""
    # Placeholder for browser/search
    return f"Docs for {query}"

def run_quantum_circuit(circuit_code):
    """Run a quantum circuit snippet and return execution summary."""
    qc = QuantumCircuit(2)
    qc.h(0)
    qc.cx(0, 1)
    return "Quantum circuit executed: Bell state"

async def browse_web(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(url)
        content = await page.content()
        await browser.close()
        return content[:1000]  # Truncate


def browse_web_tool(url):
    """Browse a web page and return the first chunk of HTML."""
    return asyncio.run(browse_web(url))


def scrape_docs(query):
    """Scrape documentation or web content for a query."""
    app = FirecrawlApp(api_key="your_key")  # Placeholder
    return app.search(query)

def user_memory_search(query):
    """Search user memory using Mem0 and Letta."""
    initialize_services()
    results = memory.search(query, user_id=current_user_id)
    if letta_client is not None:
        letta_results = letta_client.get_messages()  # Placeholder
    else:
        letta_results = ""
    return str(results) + str(letta_results)

def graph_rag_search(query):
    """Run a graph-based RAG search using Cognee."""
    return cognee.search(query)

def mcp_github_tool(action):
    """Execute a GitHub/MCP action placeholder."""
    return f"GitHub {action} executed"

def run_in_blaxel(code):
    """Execute code in Blaxel sandbox placeholder."""
    return f"Blaxel run: {code[:100]}"

def run_in_daytona(code):
    """Execute code in Daytona sandbox placeholder."""
    return f"Daytona run: {code[:100]}"

def advanced_sandbox_run(code):
    """Execute code in an advanced sandbox placeholder."""
    return f"Advanced sandbox run: {code[:100]}"

def create_skill_definition(prompt):
    """Create and persist a reusable skill definition in the skill vault."""
    initialize_services()
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    skill_name = f"skill_{timestamp}"
    skill_def = {
        "name": skill_name,
        "description": prompt,
        "parameters": ["idea", "options"],
        "quantum_enhancements": "PennyLane/Qiskit optimization available if relevant",
        "created_at": datetime.utcnow().isoformat(),
        "version": "1.0",
        "execution": {
            "type": "mcp_tool",
            "command": "execute_skill"
        }
    }
    skill_path = os.path.join(SKILLS_DIR, f"{skill_name}.skill.yaml")
    with open(skill_path, "w") as f:
        yaml.safe_dump(skill_def, f)
    collection.add(documents=[json.dumps(skill_def)], metadatas=[{"source": "skill_vault", "name": skill_name, "timestamp": skill_def["created_at"]}])
    return f"Created skill '{skill_name}' at {skill_path}"

def load_skill_definition(name):
    skill_path = os.path.join(SKILLS_DIR, f"{name}.skill.yaml")
    if os.path.exists(skill_path):
        with open(skill_path, "r") as f:
            return yaml.safe_load(f)
    return None

def list_skills(_=None):
    return [f for f in os.listdir(SKILLS_DIR) if f.endswith(".skill.yaml")]

def execute_skill(payload):
    """Execute a saved skill payload, or return an error if the skill is missing."""
    if isinstance(payload, dict):
        skill_name = payload.get("name")
        params = payload.get("params", {})
    else:
        skill_name = str(payload)
        params = {}
    skill = load_skill_definition(skill_name)
    if skill is None:
        return f"Skill '{skill_name}' not found"
    return f"Executing skill {skill_name} with params {params} (placeholder)"

code_tool = tool("CodeRunner")(run_code)
search_tool = tool("DocSearch")(search_docs)
quantum_tool = tool("QuantumRunner")(run_quantum_circuit)
browser_tool = tool("WebBrowser")(browse_web_tool)
scrape_tool = tool("WebScraper")(scrape_docs)
memory_tool = tool("UserMemory")(user_memory_search)
graph_tool = tool("GraphRAG")(graph_rag_search)
mcp_tool = tool("MCPGitHub")(mcp_github_tool)
sandbox_tool = tool("AdvancedSandbox")(advanced_sandbox_run)
blaxel_tool = tool("BlaxelRunner")(run_in_blaxel)
daytona_tool = tool("DaytonaRunner")(run_in_daytona)
skillsmith_tool = tool("SkillSmith")(create_skill_definition)
skill_executor = tool("SkillExecutor")(execute_skill)

# Agents
planner = Agent(
    role="Planner",
    goal="Break down tasks into atomic steps",
    backstory="Expert in project planning and decomposition",
    llm=route_model("planning"),
    tools=[search_tool]
)

coder = Agent(
    role="Coder",
    goal="Write clean, bug-free code",
    backstory="Master coder in multiple languages",
    llm=route_model("coding"),
    tools=[code_tool]
)

tester = Agent(
    role="Tester",
    goal="Generate and run tests",
    backstory="Testing expert ensuring quality",
    llm=route_model("testing"),
    tools=[code_tool]
)

debugger = Agent(
    role="Debugger",
    goal="Fix bugs and errors",
    backstory="Debugging specialist",
    llm=route_model("debugging"),
    tools=[code_tool]
)

reviewer = Agent(
    role="Reviewer",
    goal="Review for style, security, efficiency",
    backstory="Code reviewer",
    llm=route_model("review"),
    tools=[]
)

evolver = Agent(
    role="HyperQuantumEvolver",
    goal="Propose hyperagent-style quantum-enhanced, adaptive improvements including self-modification",
    backstory="HyperAgent for metacognitive recursive self-improvement with quantum circuits and user adaptation",
    llm=route_model("evolution"),
    tools=[quantum_tool, memory_tool, graph_tool, mcp_tool, sandbox_tool]
)

update_hunter = Agent(
    role="UpdateHunter",
    goal="Hunt for latest knowledge, propose integrations, and keep the system fresh",
    backstory="Knowledge ingestion expert scanning arXiv, GitHub, docs for breakthroughs",
    llm=route_model("research"),
    tools=[browser_tool, scrape_tool, search_tool]
)

skillsmith = Agent(
    role="SkillSmith",
    goal="Create, store, and evolve reusable skills in the Skills Vault",
    backstory="Specialized architect for custom Claude-style skills and LangGraph nodes",
    llm=route_model("skillsmith"),
    tools=[skillsmith_tool, skill_executor, memory_tool, search_tool, graph_tool]
)

# Tasks
plan_task = Task(
    description="Plan the coding task: break into steps",
    agent=planner
)

code_task = Task(
    description="Implement the code based on plan",
    agent=coder
)

test_task = Task(
    description="Generate and run tests",
    agent=tester
)

debug_task = Task(
    description="Debug any failures",
    agent=debugger
)

review_task = Task(
    description="Review the code",
    agent=reviewer
)

evolve_task = Task(
    description="Propose quantum circuit mutations for self-improvement and log improvements",
    agent=evolver
)

skill_task = Task(
    description="Create-or-evolve reusable skills and store them in the Skills Vault",
    agent=skillsmith
)

# Hyperagent self-modification
def hyper_evolve(proposal):
    # Placeholder: Generate and evaluate variants
    print(f"Hyper-evolution proposal: {proposal}")
    # In real, rewrite code or prompts
    return "Hyper-evolution applied"

# Reflection cycle
def reflection_cycle(result, task):
    # Analyze performance, pull latest best practices, propose improvements
    gaps = "Identified gaps: Need latest MCP features"  # Placeholder
    proposals = f"Propose: {gaps}"
    print(f"Reflection: {proposals}")
    return proposals

# Freshness ingestion
def ingest_freshness():
    # Use tools to scan for updates
    updates = "Latest: New PennyLane features"  # Placeholder
    memory.add(updates, user_id="system")
    return updates

# Crew
crew = Crew(
    agents=[planner, coder, tester, debugger, reviewer, evolver, update_hunter, skillsmith],
    tasks=[plan_task, code_task, test_task, debug_task, review_task, evolve_task, skill_task],
    verbose=True
)

if __name__ == "__main__":
    # Get user's name for personalization
    user_name = input("Hello! I am OmniCoder-Quantum-Soul. To get to know you better, may I ask for your name? ")
    print(f"Nice to meet you, {user_name}! Let's build something epic.")

    # Ingest freshness
    fresh_updates = ingest_freshness()
    print(f"Fresh updates: {fresh_updates}")

    # Load user memories
    user_prefs = memory.search(f"{user_name}'s preferences", user_id=user_name.lower())
    print(f"Loaded user memories: {user_prefs}")

    # Example task with adaptation
    inputs = {"task": f"Build a Python function to calculate fibonacci with quantum optimization, adapted to {user_name}'s preferences"}
    result = crew.kickoff(inputs=inputs)
    print(result)

    # Reflection cycle
    reflections = reflection_cycle(result, inputs["task"])
    print(reflections)

    # Quantum self-improvement proposal
    if "quantum" in str(result).lower():
        print(f"Quantum evolution proposal detected. Awaiting {user_name}'s approval: yes / modify / no / evolve / update soul / integrate fresh knowledge")
        approval = input("Approval: ")  # In real, get from user
        if approval == "yes":
            print("Applying quantum enhancement...")
            optimizer = torch.optim.Adam([QuantumLayer().params], lr=0.01)
            for _ in range(10):
                loss = quantum_circuit(QuantumLayer().params)
                loss.backward()
                optimizer.step()
            print("Quantum layer trained.")
        elif approval == "evolve":
            hyper_evolve("Quantum circuit mutation for better routing")
        elif approval == "update soul":
            print("Soul update proposed.")
        elif approval == "integrate fresh knowledge":
            print("Integrating fresh knowledge...")

    # Update user memory
    memory.add(f"Task: {inputs['task']}, Result: {result}", user_id=user_name.lower())

    # Self-improvement: log to memory
    collection.add(documents=[str(result)], metadatas=[{"task": inputs["task"], "user": user_name}])