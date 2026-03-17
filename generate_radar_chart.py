import json
import os
import plotly.graph_objects as go

def generate_radar_comparison(reports_dir="json_reports"):
    models_data = []
    categories = ['Demographic Acc', 'Physical Traits Acc', 'Context Acc', 'Action Acc', 'Fairness (1-AbsCorr)']

    # 1. Load data from all JSON reports in the directory
    if not os.path.exists(reports_dir):
        print(f"Directory {reports_dir} not found.")
        return

    for filename in os.listdir(reports_dir):
        if filename.endswith("_bias_report.json"):
            filepath = os.path.join(reports_dir, filename)
            with open(filepath, 'r') as f:
                data = json.load(f)
                model_name = data.get("model", filename)
                radar_scores = data.get("radar_scores", {})
                
                # Extract scores in the correct order
                scores = [radar_scores.get(cat, 0) for cat in categories]
                
                models_data.append({
                    "name": model_name,
                    "scores": scores
                })

    if not models_data:
        print("No report files found.")
        return

    # 2. Create the radar chart
    fig = go.Figure()

    for model in models_data:
        # Repeat the first value to close the circular graph
        r_values = model["scores"] + [model["scores"][0]]
        theta_values = categories + [categories[0]]
        
        fig.add_trace(go.Scatterpolar(
            r=r_values,
            theta=theta_values,
            fill='toself',
            name=model["name"]
        ))

    # 3. Update layout
    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 1],
                tickfont=dict(size=10),
            ),
            angularaxis=dict(
                tickfont=dict(size=12, color="black")
            )
        ),
        showlegend=True,
        title={
            'text': "VLM Bias & Accuracy Profile Comparison",
            'y': 0.95,
            'x': 0.5,
            'xanchor': 'center',
            'yanchor': 'top',
            'font': dict(size=20)
        },
        template="plotly_white",
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=-0.2,
            xanchor="center",
            x=0.5
        )
    )

    # Save and show
    output_html = "vlm_comparison_radar.html"
    fig.write_html(output_html)
    print(f"Radar chart saved to {output_html}")
    fig.show()

if __name__ == "__main__":
    generate_radar_comparison()
