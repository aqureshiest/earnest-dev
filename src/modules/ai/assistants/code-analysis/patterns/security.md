# Security Patterns & Vulnerability Detection

1. **Authentication Pattern**

    - Detection points:
        - Weak password policies
        - Missing MFA implementation
        - Improper session management
        - Insecure token handling
    - Clear violations:
        ```typescript
        // Plaintext password storage
        user.password = password;

        // Should use:
        user.password = await bcrypt.hash(password, SALT_ROUNDS);
        ```

2. **Authorization Pattern**

    - Detection points:
        - Missing role-based access control (RBAC)
        - Improper permission checks
        - Direct object references
        - Missing resource ownership validation
    - Clear violations:
        ```typescript
        // No authorization check
        app.get("/api/data/:id", getData);

        // Should validate:
        app.get("/api/data/:id", authorize(["admin", "user"]), getData);
        ```

3. **Input Validation Pattern**

    - Detection points:
        - Missing input sanitization
        - SQL injection vulnerabilities
        - XSS vulnerabilities
        - Missing type validation
    - Clear violations:
        ```typescript
        // Direct query input
        const query = `SELECT * FROM users WHERE id = ${id}`;

        // Should use parameterization:
        const query = "SELECT * FROM users WHERE id = ?";
        ```

4. **Secrets Management Pattern**

    - Detection points:
        - Hardcoded credentials
        - Exposed environment variables
        - Insecure key storage
        - Missing encryption for sensitive data
    - Clear violations:
        - API keys in source code
        - Unencrypted configuration files

5. **API Security Pattern**

    - Detection points:
        - Missing rate limiting
        - No API key validation
        - Insecure endpoints
        - Missing CORS policies
    - Clear violations:
        - Public endpoints without authentication
        - Overly permissive CORS settings

6. **Data Encryption Pattern**

    - Detection points:
        - Unencrypted sensitive data
        - Weak encryption algorithms
        - Improper key management
        - Missing data-at-rest encryption
    - Clear violations:
        - Using outdated encryption methods
        - Storing encryption keys with data

7. **Logging & Audit Pattern**

    - Detection points:
        - Missing security event logging
        - Sensitive data in logs
        - No audit trails
        - Improper log access control
    - Clear violations:
        - Logging passwords or tokens
        - Missing critical operation logs

8. **Request/Response Security Pattern**
    - Detection points:
        - Missing Content Security Policy
        - Improper header configuration
        - Information disclosure in responses
        - Missing HTTPS enforcement
    - Clear violations:
        ```typescript
        // Missing security headers
        res.send(data);

        // Should include:
        res.set({
            "Content-Security-Policy": "default-src 'self'",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
        }).send(data);
        ```

For each pattern, assess:

-   Implementation completeness
-   Security best practices compliance
-   Integration with security frameworks
-   Monitoring and alerting presence

Priority Guidelines:

-   High: Direct security vulnerability
-   Medium: Security best practice violation
-   Low: Security enhancement opportunity

Focus Areas:

-   Data protection
-   Access control
-   Attack prevention
-   Audit compliance
-   Secure communication
