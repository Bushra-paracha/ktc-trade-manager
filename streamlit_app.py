# This file enables Streamlit Cloud deployment
# Streamlit automatically detects and runs this file
import subprocess
import sys

if __name__ == "__main__":
    subprocess.run([sys.executable, "-m", "streamlit", "run", "status_summarizer.py"])