import pandas as pd
import plotly.subplots as sp
import plotly.graph_objects as go

# Load data from the CSV file
df = pd.read_csv(r'C:\Users\VINAY SHETYE\Documents\LiClipse Workspace\DataVisualization_PROJECT\package1\data\mass_shootings_2014_2022.csv')

# Convert 'Incident Date' to datetime format
df['Incident Date'] = pd.to_datetime(df['Incident Date'])

# Extract year from the date
df['Year'] = df['Incident Date'].dt.year

# Group by year and state, sum the number of victims injured and killed
grouped_data = df.groupby(['State', 'Year']).agg({
    'Victims Injured': 'sum',
    'Victims Killed': 'sum'
}).reset_index()

# Get unique states
states = grouped_data['State'].unique()

# Create subplots with 5 mini line graphs in one row
fig = sp.make_subplots(rows=len(states)//5 + 1, cols=5, subplot_titles=states)

# Create line charts for each state with specified line colors
for i, state in enumerate(states):
    state_data = grouped_data[grouped_data['State'] == state]
    fig.add_trace(go.Scatter(x=state_data['Year'], y=state_data['Victims Injured'], mode='lines+markers', name=f'{state} - Injured',
                             line=dict(width=2, dash='dash', color='gold')), row=i//5 + 1, col=i%5 + 1)
    fig.add_trace(go.Scatter(x=state_data['Year'], y=state_data['Victims Killed'], mode='lines+markers', name=f'{state} - Killed',
                             line=dict(width=2, dash='dash', color='red')), row=i//5 + 1, col=i%5 + 1)

# Update layout
fig.update_layout(
    title_text='<b>Number of Victims Injured and Killed Over the Years (Statewise)</b>',
    title_x=0.5,  # Set the title's x-coordinate to the center
    showlegend=False,  # Hide the legend
    height=len(states) // 5 * 300,  # Increase the height
    width=1500,  # Increase the width
)

# Remove manual range setting for y-axis, let Plotly automatically determine the range
fig.update_yaxes(range=[None, None])

# Show the plot
fig.show()
