import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

def main():
    """
    Main function to execute the machine learning pipeline for heart disease prediction.
    
    This script performs the following steps:
    1. Loads the 'heart_disease_data.csv' dataset.
    2. Preprocesses the data (handling missing values, feature splitting, standard scaling).
    3. Trains multiple classification models (Logistic Regression, Random Forest, Decision Tree, KNN).
    4. Evaluates each model's accuracy on a test set (20% split).
    5. Automatically saves the highest performing model to a `.pkl` file for backend inference.
    """
    # 1. Load Data
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, 'heart_disease_data.csv')
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}")
        return

    print("Loading data...")
    df = pd.read_csv(data_path)
    
    # Check for missing values (basic handling for demonstration)
    if df.isnull().sum().any():
        print("Missing values detected. Dropping rows with missing values...")
        df = df.dropna()

    # 2. Data Preprocessing
    print("Preprocessing data...")
    
    # Isolate feature columns (X) from the target label (y)
    X = df.drop(columns=['target'])
    y = df['target']

    # Train/Test Split
    # Split the dataset: 80% for training the model, 20% for testing unseen data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Scaling
    # Standardize features by removing the mean and scaling to unit variance.
    # This is critical for models sensitive to feature magnitude (like Logistic Regression and KNN).
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 3. Model Building & Training
    # Define a dictionary of models to evaluate
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=42),
        'Decision Tree': DecisionTreeClassifier(random_state=42),
        'KNN': KNeighborsClassifier(n_neighbors=5)
    }

    results = {}
    print("\nTraining and Evaluating Models...\n")
    
    # 4. Model Evaluation
    best_model_name = None
    best_accuracy = 0
    best_model = None

    for name, model in models.items():
        # Train
        # Tree-based models (Random Forest, Decision Tree) don't strictly require scaled data,
        # but distance-based/linear models (KNN, Logistic Regression) do.
        if name in ['Logistic Regression', 'KNN']:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
        
        # Evaluate
        acc = accuracy_score(y_test, y_pred)
        results[name] = acc
        print(f"--- {name} ---")
        print(f"Accuracy: {acc:.4f}")
        print("Classification Report:")
        print(classification_report(y_test, y_pred))
        print("-" * 30)

        if acc > best_accuracy:
            best_accuracy = acc
            best_model_name = name
            best_model = model

    print(f"\nBest Model: {best_model_name} with Accuracy: {best_accuracy:.4f}")

    # 5. Save Model and Scaler
    # Save the highest accuracy model and the scaler to disk so the FastAPI backend can load them
    print(f"Saving best model ({best_model_name}) and scaler...")
    joblib.dump(best_model, 'best_heart_disease_model.pkl')
    joblib.dump(scaler, 'scaler.pkl')
    print("Model and scaler saved successfully.")

if __name__ == "__main__":
    main()
