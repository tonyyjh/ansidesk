FROM python:3.11

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Instalar Node.js y npm
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && node -v && npm -v

RUN cd /app/script && npm install axios node-ssh || echo "Node.js dependencies installation failed, check createM.js requirements"

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app", "--reload"]
