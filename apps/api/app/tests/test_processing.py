from app.models.entities import Material, ProcessingJob
from app.models.enums import ProcessingStage, ProcessingStatus
from app.services.processing import run_material_pipeline


def test_processing_task_skips_completed_job(db_session, seeded_data, monkeypatch):
    monkeypatch.setattr("app.services.processing.SessionLocal", lambda: db_session)
    material = seeded_data["material"]
    job = ProcessingJob(
        material_id=material.id,
        task_name="process_material_pipeline",
        status=ProcessingStatus.COMPLETED,
        stage=ProcessingStage.COMPLETED,
        attempts=1,
        logs_json=[{"stage": "completed", "message": "Already done."}],
    )
    db_session.add(job)
    db_session.commit()
    material_id = material.id
    job_id = job.id

    run_material_pipeline(material.id, job.id)

    job = db_session.query(ProcessingJob).filter(ProcessingJob.id == job_id).one()
    material = db_session.query(Material).filter(Material.id == material_id).one()
    assert job.status == ProcessingStatus.COMPLETED
    assert job.attempts == 1
    assert job.logs_json[-1]["message"] == "Processing task skipped because the job is not pending."
    assert material.processing_status == ProcessingStatus.COMPLETED


def test_processing_task_skips_running_job(db_session, seeded_data, monkeypatch):
    monkeypatch.setattr("app.services.processing.SessionLocal", lambda: db_session)
    material = seeded_data["material"]
    job = ProcessingJob(
        material_id=material.id,
        task_name="process_material_pipeline",
        status=ProcessingStatus.RUNNING,
        stage=ProcessingStage.EXTRACTING,
        attempts=1,
        logs_json=[{"stage": "extracting", "message": "Already running."}],
    )
    db_session.add(job)
    db_session.commit()
    job_id = job.id

    run_material_pipeline(material.id, job.id)

    job = db_session.query(ProcessingJob).filter(ProcessingJob.id == job_id).one()
    assert job.status == ProcessingStatus.RUNNING
    assert job.stage == ProcessingStage.EXTRACTING
    assert job.attempts == 1
    assert job.logs_json[-1]["message"] == "Processing task skipped because the job is not pending."
