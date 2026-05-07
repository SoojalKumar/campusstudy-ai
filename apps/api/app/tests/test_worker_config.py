from app.workers.celery_app import celery_app


def test_worker_imports_processing_tasks():
    assert "app.workers.tasks" in celery_app.conf.imports
    celery_app.loader.import_default_modules()
    assert "app.workers.tasks.process_material_pipeline" in celery_app.tasks
