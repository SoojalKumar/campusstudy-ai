from app.services.processing import run_material_pipeline
from app.workers.celery_app import celery_app


@celery_app.task(name="app.workers.tasks.process_material_pipeline")
def process_material_pipeline(material_id: str, job_id: str) -> None:
    run_material_pipeline(material_id, job_id)

