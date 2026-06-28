FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json .

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Build for production
RUN npm run build

# Serve with nginx or use preview
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
