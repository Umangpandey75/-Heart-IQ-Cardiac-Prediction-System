# ❤️ HeartIQ – Advanced Heart Disease Prediction System

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://heartiqsystem.streamlit.app/)

HeartIQ is a data-driven system designed to predict the likelihood of heart disease using machine learning algorithms. It analyzes clinical patient health parameters such as age, cholesterol, blood pressure, and chest pain type to identify potential risks early.

🔗 **Live Application URL:** [https://heartiqsystem.streamlit.app/](https://heartiqsystem.streamlit.app/)

---

## 🚀 Key Features

* **Advanced Predictive Modeling**: Powered by an ensemble machine learning model trained on diagnostic data.
* **Interactive Chatbot (CardioBot)**: In-app AI assistant powered by Gemini for instant health guidance.
* **Real-time Diagnostic Explanation**: Visual and textual explanations of critical factors driving the prediction.
* **Patient Database**: View, manage, and save diagnostic histories locally.
* **Professional Reporting**: Integrated tool to print reports or save them as PDFs.

---

## 🛠️ Technology Stack

* **Frontend/UI**: [Streamlit](https://streamlit.io/)
* **Machine Learning**: [scikit-learn](https://scikit-learn.org/), [joblib](https://joblib.readthedocs.io/), [NumPy](https://numpy.org/)
* **Visualization**: [Plotly](https://plotly.com/), [Pandas](https://pandas.pydata.org/)
* **API Integration**: Google Generative AI (Gemini)

---

## 📊 Project Methodology

1. **Data Collection & Cleaning**: Process patient parameters (age, cholesterol, blood pressure, etc.).
2. **Correlation Analysis**: Identify associations between clinical features and heart disease.
3. **Data Splitting**: Split the dataset into training and testing sets.
4. **Model Training**: Train and compare classification models (Logistic Regression, Random Forest, SVM, etc.).
5. **Model Evaluation**: Assess performance using accuracy, precision, recall, and ROC curves.
6. **Feature Importance**: Highlight and visualize clinical metrics influencing prediction outcomes.
7. **Interactive Web App**: Build a clean user interface enabling live data entry and diagnostic output.

---

## 💻 Running Locally

To run the project on your machine:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Umangpandey75/HeartIQ-4th-year-project.git
   cd HeartIQ-4th-year-project
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the app**:
   ```bash
   streamlit run cardioai.py
   ```

---

## 📸 Application Screenshots

<div align="center">
  <img width="1600" height="900" alt="Dashboard View" src="https://github.com/user-attachments/assets/d3293cab-f3d7-4aef-b6d1-0d41da7eb1e1" />
  <img width="1600" height="900" alt="Prediction View" src="https://github.com/user-attachments/assets/e0adf9fb-8968-43b9-9f60-b4ef59bfb1c2" />
  <img width="1600" height="900" alt="Patient Records" src="https://github.com/user-attachments/assets/f15b102f-be85-4187-9137-6f3aac3b2e34" />
  <img width="1600" height="900" alt="CardioBot Chat" src="https://github.com/user-attachments/assets/7b8e2d9b-aa20-443a-8822-560d9a8a78fd" />
</div>
