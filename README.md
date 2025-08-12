# IPO Edge Panel Backend

A Node.js/Express backend API for the IPO Edge Panel application that provides IPO data scraping and management functionality.

## 🚀 Features

- **IPO Data Scraping**: Fetch IPO listing details, company information, and screener data
- **RESTful API**: Clean and organized API endpoints
- **CORS Support**: Configured for cross-origin requests
- **Security**: Helmet.js for security headers
- **Logging**: Morgan for HTTP request logging
- **TypeScript**: Full TypeScript support for better development experience
- **Vercel Deployment**: Optimized for serverless deployment on Vercel

## 📋 API Endpoints

### Health Check
- `GET /api/health` - Main API health check
- `GET /api/ipos/health` - IPO service health check

### IPO Data
- `GET /api/ipos/listing-details` - Fetch list of all IPOs
- `GET /api/ipos/company/:companyId` - Fetch IPO data for a specific company
- `GET /api/ipos/screener/:year` - Fetch IPO screener data for a specific year

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **HTTP Client**: Axios
- **Security**: Helmet.js
- **CORS**: cors
- **Logging**: Morgan
- **Environment**: dotenv
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/secretdeveloper90/ipoedge-scraping-be.git
   cd ipoedge-scraping-be
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   TRENDLYNE_BASE_URL=https://trendlyne.com/ipo/api
   ```

## 🚀 Development

### Local Development
```bash
# Start development server with hot reload
npm run dev

# Start development server with nodemon
npm run dev:watch
```

### Build
```bash
# Compile TypeScript
npm run build

# Start production server
npm start
```

## 🌐 Deployment

### Vercel Deployment

This project is configured for deployment on Vercel with serverless functions.

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Link to Vercel project**
   ```bash
   vercel link
   ```

3. **Set environment variables**
   ```bash
   vercel env add NODE_ENV
   vercel env add TRENDLYNE_BASE_URL
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Environment Variables

Set these environment variables in your Vercel dashboard:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Environment mode |
| `TRENDLYNE_BASE_URL` | `https://trendlyne.com/ipo/api` | Base URL for IPO data source |
| `PORT` | `5000` | Server port (optional for Vercel) |

## 📁 Project Structure

```
├── api/                    # Vercel serverless functions
│   └── index.ts           # Main API entry point
├── public/                # Static files
│   └── index.html         # API documentation page
├── src/                   # Source code
│   ├── controllers/       # Route controllers
│   ├── routes/           # API routes
│   └── server.ts         # Express server setup
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vercel.json           # Vercel deployment configuration
└── README.md             # Project documentation
```

## 🔧 Configuration

### TypeScript Configuration
The project uses TypeScript with strict mode enabled. Configuration is in `tsconfig.json`.

### Vercel Configuration
Serverless function configuration is in `vercel.json`:
- Uses `@vercel/node` for TypeScript compilation
- Routes all requests to the main API handler
- Supports both development and production environments

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
```

## 📝 API Usage Examples

### Get API Health Status
```bash
curl https://ipoedge-scraping-be.vercel.app/api/health
```

### Get IPO Listing Details
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/listing-details
```

### Get Company IPO Data
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/company/12345
```

### Get IPO Screener Data
```bash
curl https://ipoedge-scraping-be.vercel.app/api/ipos/screener/2024
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🔗 Links

- **Live API**: https://ipoedge-scraping-be.vercel.app
- **Repository**: https://github.com/secretdeveloper90/ipoedge-scraping-be
- **Issues**: https://github.com/secretdeveloper90/ipoedge-scraping-be/issues

## 📞 Support

For support, email ipoedge.app@gmail.com or create an issue in the repository.
