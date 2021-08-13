from flask import Flask
import os


def init_app():
    app = Flask(__name__)

    with app.app_context():

        from . import routes

        return app