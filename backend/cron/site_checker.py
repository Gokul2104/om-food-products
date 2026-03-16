import requests
data = requests.get("https://om-food-products-backend.onrender.com/")
print(data.json())