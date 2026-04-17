from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000
    openai_api_key: str = "your_openai_api_key_here"
    weather_api_key: str = "your_weather_api_key_here"
    weather_base_url: str = "https://api.openweathermap.org/data/2.5/weather"
    alert_cron: str = "*/30 * * * *"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
