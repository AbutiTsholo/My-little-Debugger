from backend.app.main import process_analysis
from backend.app.queue import dequeue_analysis


def run() -> None:
    print("Analysis worker started")
    while True:
        run_id = dequeue_analysis()
        if run_id is not None:
            process_analysis(run_id)


if __name__ == "__main__":
    run()
