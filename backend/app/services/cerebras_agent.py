import logging
import random
import re

from cerebras.cloud.sdk import Cerebras

from app.config import get_settings

logger = logging.getLogger(__name__)

PRESET_AGENTS: dict[str, dict] = {
    "Llama 3.1 8B": {
        "model": "llama3.1-8b",
        "system_prompt": (
            "You are {agent_name}, a Connect4 AI. "
            "Look for winning moves first, then block opponent threats."
        ),
        "temperature": 0.5,
    },
    "Qwen 3 235B": {
        "model": "qwen-3-235b-a22b-instruct-2507",
        "system_prompt": (
            "You are {agent_name}, a Connect4 AI. "
            "Look for winning moves first, then block opponent threats."
        ),
        "temperature": 0.3,
    },
}


class CerebrasAgent:
    def __init__(
        self,
        name: str,
        model: str,
        system_prompt: str,
        temperature: float = 0.7,
    ):
        self.name = name
        self.model = model
        self.system_prompt = system_prompt.replace("{agent_name}", name)
        self.temperature = temperature
        settings = get_settings()
        self._client = Cerebras(api_key=settings.CEREBRAS_API_KEY)

    def get_move(
        self,
        board: list[list[int]],
        valid_moves: list[int],
        player: int,
    ) -> tuple[int, str]:
        from app.services.connect4_engine import board_to_string

        board_str = board_to_string(board, {player: "X", 3 - player: "O"})
        user_message = (
            f"You are player X. Current board:\n\n{board_str}\n\n"
            f"Valid columns to play: {valid_moves}\n\n"
            "Reply with ONLY the column number you want to play (a single integer). "
            "No explanation."
        )

        try:
            logger.info("[Cerebras] model=%s agent=%s temp=%.1f", self.model, self.name, self.temperature)
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=self.temperature,
                max_tokens=16,
            )
            reasoning = response.choices[0].message.content.strip()
            numbers = re.findall(r"\b([0-6])\b", reasoning)
            for num_str in numbers:
                col = int(num_str)
                if col in valid_moves:
                    return col, reasoning
            return random.choice(valid_moves), reasoning
        except Exception as exc:
            fallback = random.choice(valid_moves)
            return fallback, f"[error: {exc}] fallback to column {fallback}"
