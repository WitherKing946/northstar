from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas

router = APIRouter(tags=["catalog"])

@router.get("/resources", response_model=list[schemas.ResourceOut])
def list_resources(db: Session = Depends(get_db)):
    resources = db.query(models.Resource).all()
    return resources