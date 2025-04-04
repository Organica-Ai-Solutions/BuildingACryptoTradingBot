from flask import Flask
from backend.api_routes import api_blueprint

app = Flask(__name__)
app.register_blueprint(api_blueprint, url_prefix='/api')

def print_routes():
    print("Registered routes:")
    for rule in sorted(app.url_map.iter_rules(), key=lambda x: str(x)):
        print(f"{rule}, Methods: {rule.methods}")

if __name__ == "__main__":
    print_routes() 