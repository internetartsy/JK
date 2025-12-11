from fastapi import APIRouter

router = APIRouter(
    prefix="/geo",
    tags=["geo"]
)

@router.get("/tiles/{z}/{x}/{y}")
async def get_tiles(z: int, x: int, y: int):
    # Stub for tiles
    return {"message": "Tile server stub"}
