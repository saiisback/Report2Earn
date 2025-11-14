# Contributing to Report2Earn

Thank you for your interest in contributing to Report2Earn! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/your-username/r2e/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node/Python versions)
   - Screenshots if applicable

### Suggesting Features

1. Check existing [Issues](https://github.com/your-username/r2e/issues) and [Discussions](https://github.com/your-username/r2e/discussions)
2. Open a new issue with:
   - Clear description of the feature
   - Use case and motivation
   - Proposed implementation (if you have ideas)

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the code style and conventions
   - Write/update tests if applicable
   - Update documentation as needed

4. **Test your changes**
   ```bash
   # Frontend
   cd apps/report2earn/frontend
   npm run lint
   npm run build
   
   # Backend
   cd apps/report2earn/ai-verify
   python -m pytest  # if tests exist
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for code refactoring
   - `test:` for tests
   - `chore:` for maintenance

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Provide a clear title and description
   - Reference any related issues
   - Wait for review and address feedback

## Development Setup

### Prerequisites

- Node.js 18+ and npm/pnpm
- Python 3.9+
- Git
- Algorand wallet (for blockchain features)

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/r2e.git
   cd r2e
   ```

2. **Install dependencies**
   ```bash
   # Install workspace dependencies
   pnpm install
   
   # Install Python dependencies
   cd apps/ai-verification-module
   pip install -e .
   
   cd ../report2earn/ai-verify
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   - Copy `.env.example` files (if they exist)
   - Fill in your API keys and configuration

4. **Run the development servers**
   ```bash
   # Terminal 1: Backend
   cd apps/report2earn/ai-verify
   python main.py
   
   # Terminal 2: Frontend
   cd apps/report2earn/frontend
   pnpm dev
   ```

## Project Structure

```
r2e/
├── apps/
│   ├── ai-verification-module/    # Reusable AI verification package
│   ├── smart-contracts/           # Shared Algorand contracts
│   └── report2earn/               # Main application
│       ├── ai-verify/             # FastAPI backend
│       ├── frontend/              # Next.js frontend
│       └── smart-contracts/       # App-specific contracts
├── .github/                       # GitHub templates and workflows
└── docs/                          # Additional documentation
```

## Coding Standards

### Python

- Follow [PEP 8](https://pep8.org/) style guide
- Use type hints where possible
- Write docstrings for public functions/classes
- Maximum line length: 100 characters

### TypeScript/JavaScript

- Follow [ESLint](https://eslint.org/) configuration
- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks

### Git

- Write clear, descriptive commit messages
- Keep commits focused and atomic
- Use conventional commit format

## Testing

- Write tests for new features
- Ensure existing tests pass
- Aim for meaningful test coverage

## Documentation

- Update README.md if needed
- Add JSDoc/Python docstrings
- Update API documentation
- Keep CHANGELOG.md updated

## Questions?

- Open a [Discussion](https://github.com/your-username/r2e/discussions)
- Check existing [Issues](https://github.com/your-username/r2e/issues)
- Reach out to maintainers

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to Report2Earn! 🎉



