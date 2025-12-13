# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue. Instead, please report it via one of the following methods:

1. **Email**: Send details to security@gandom-perfume.ir
2. **Private Security Advisory**: Use GitHub's private vulnerability reporting feature

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)
- Your contact information

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity, typically 30-90 days

### Security Best Practices

For users deploying this application:

1. **Keep Dependencies Updated**: Regularly update Python and Node.js dependencies
2. **Use Strong Secrets**: Generate strong `SECRET_KEY` and `ADMIN_ACCESS_KEY` values
3. **Enable HTTPS**: Always use SSL/TLS in production
4. **Restrict Access**: Use firewall rules to limit access to necessary ports
5. **Regular Backups**: Backup your database regularly
6. **Monitor Logs**: Regularly review application and server logs
7. **Keep System Updated**: Keep your VPS operating system and packages updated

### Known Security Considerations

- The application uses SQLite by default. For production with high traffic, consider migrating to PostgreSQL
- Admin API endpoints require `ADMIN_ACCESS_KEY` header - keep this secret secure
- OpenAI API keys are stored in environment variables - ensure these are never committed to version control
- Media uploads are stored in `backend/media/` - ensure proper file permissions and validation

## Security Updates

Security updates will be released as patch versions (e.g., 0.1.0 → 0.1.1) and will be clearly marked in the CHANGELOG.

