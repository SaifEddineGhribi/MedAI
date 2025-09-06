from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional


DEFAULT_MODEL_ID = "anthropic.claude-3-haiku-20240307-v1:0"
DEFAULT_MAX_TOKENS = 512
DEFAULT_TEMPERATURE = 0.2


@dataclass
class AWSConfig:
    region: Optional[str] = None
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    session_token: Optional[str] = None


@dataclass
class ModelConfig:
    model_id: str = DEFAULT_MODEL_ID
    max_tokens: int = DEFAULT_MAX_TOKENS
    temperature: float = DEFAULT_TEMPERATURE
    system_prompt: str = (
        "You are a helpful medical assistant. Answer clearly and concisely."
    )
    # If set, calls will be made via this Bedrock Inference Profile instead of model_id
    inference_profile_arn: Optional[str] = None


@dataclass
class AppConfig:
    aws: AWSConfig
    model: ModelConfig


def _get_env(name: str, default: Optional[str] = None) -> Optional[str]:
    val = os.getenv(name)
    return val if val not in (None, "") else default


def _load_json(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_config(path: Optional[str] = None) -> AppConfig:
    """
    Load application configuration from a JSON file and environment variables.

    Precedence (highest to lowest):
      1. Environment variables
      2. JSON file at MEDAI_CONFIG_PATH or explicit `path`

    Supported env vars:
      - AWS_REGION or AWS_DEFAULT_REGION
      - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
      - BEDROCK_MODEL_ID, MEDAI_SYSTEM_PROMPT
      - MEDAI_MAX_TOKENS, MEDAI_TEMPERATURE
      - MEDAI_CONFIG_PATH (if `path` not provided)
    """
    cfg_path = path or _get_env("MEDAI_CONFIG_PATH")
    data: Dict[str, Any] = {}
    if cfg_path and os.path.exists(cfg_path):
        try:
            data = _load_json(cfg_path)
        except Exception:
            # Ignore parse errors and fall back to env only
            data = {}

    # Accessors from JSON structure {"aws": {...}, "model": {...}}
    aws_data = data.get("aws", {}) if isinstance(data, dict) else {}
    model_data = data.get("model", {}) if isinstance(data, dict) else {}

    aws = AWSConfig(
        region=_get_env("AWS_REGION", _get_env("AWS_DEFAULT_REGION", aws_data.get("region"))),
        access_key_id=_get_env("AWS_ACCESS_KEY_ID", aws_data.get("access_key_id")),
        secret_access_key=_get_env("AWS_SECRET_ACCESS_KEY", aws_data.get("secret_access_key")),
        session_token=_get_env("AWS_SESSION_TOKEN", aws_data.get("session_token")),
    )

    # Numeric envs
    def _int_env(name: str, default: int) -> int:
        val = os.getenv(name)
        if val is None:
            return default
        try:
            return int(val)
        except ValueError:
            return default

    def _float_env(name: str, default: float) -> float:
        val = os.getenv(name)
        if val is None:
            return default
        try:
            return float(val)
        except ValueError:
            return default

    model = ModelConfig(
        model_id=_get_env("BEDROCK_MODEL_ID", model_data.get("model_id", DEFAULT_MODEL_ID)) or DEFAULT_MODEL_ID,
        max_tokens=_int_env("MEDAI_MAX_TOKENS", int(model_data.get("max_tokens", DEFAULT_MAX_TOKENS))),
        temperature=_float_env("MEDAI_TEMPERATURE", float(model_data.get("temperature", DEFAULT_TEMPERATURE))),
        system_prompt=_get_env("MEDAI_SYSTEM_PROMPT", model_data.get("system_prompt"))
        or ModelConfig.system_prompt,
        inference_profile_arn=_get_env("BEDROCK_INFERENCE_PROFILE_ARN", model_data.get("inference_profile_arn")),
    )

    return AppConfig(aws=aws, model=model)
