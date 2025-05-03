"""
Configuration settings for the Tic Tac Toe Ultimate backend
"""
import os

# Flask application settings
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_key_change_in_production')

# Database settings
DB_USERNAME = os.environ.get('DB_USERNAME', 'backend')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'OgBA0BBi8qhWd6ZhkegH')
DB_HOST = os.environ.get('DB_HOST', '217.154.85.170')
DB_NAME = os.environ.get('DB_NAME', 'DB')
SQLALCHEMY_DATABASE_URI = f'mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}'
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Bot response timeout (seconds)
BOT_RESPONSE_TIMEOUT = 3