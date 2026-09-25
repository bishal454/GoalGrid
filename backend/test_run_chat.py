import asyncio
from app.services.agent_service import AgentService

async def main():
    service = AgentService()
    try:
        res = await service.run_chat("user99@gmail.com", "Hello Globus!")
        print(res)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
