class SecurityLayer {
  static detectSQLInjection(query) {
    const patterns = [
      /('|")\s*OR\s*1\s*=\s*1/i,
      /('|")\s*--/i,
      /('|")\s*#/i,
      /UNION\s+SELECT/i,
      /;\s*(DROP|DELETE|INSERT|UPDATE|ALTER)/i,
      /xp_cmdshell/i,
      /EXEC\s*\(/i,
      /('|")\s*OR\s*('|")\s*=\s*('|")/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(query)) {
        return {
          detected: true,
          pattern: pattern.toString(),
          message: 'Potential SQL injection detected'
        };
      }
    }

    return { detected: false };
  }

  static classifyQuery(query) {
    const upperQuery = query.toUpperCase().trim();
    
    let category, operation, riskLevel;

    if (upperQuery.startsWith('SELECT')) {
      category = 'DQL';
      operation = 'SELECT';
      riskLevel = 'Low';
    } else if (upperQuery.startsWith('INSERT')) {
      category = 'DML';
      operation = 'INSERT';
      riskLevel = 'Medium';
    } else if (upperQuery.startsWith('UPDATE')) {
      category = 'DML';
      operation = 'UPDATE';
      riskLevel = 'High';
    } else if (upperQuery.startsWith('DELETE')) {
      category = 'DML';
      operation = 'DELETE';
      riskLevel = 'Critical';
    } else if (['CREATE', 'ALTER', 'DROP', 'TRUNCATE'].some(op => upperQuery.startsWith(op))) {
      category = 'DDL';
      operation = upperQuery.split(' ')[0];
      riskLevel = 'Critical';
    } else if (['GRANT', 'REVOKE'].some(op => upperQuery.startsWith(op))) {
      category = 'DCL';
      operation = upperQuery.split(' ')[0];
      riskLevel = 'High';
    } else if (['COMMIT', 'ROLLBACK', 'SAVEPOINT'].some(op => upperQuery.startsWith(op))) {
      category = 'TCL';
      operation = upperQuery.split(' ')[0];
      riskLevel = 'Medium';
    } else {
      category = 'Unknown';
      operation = 'Unknown';
      riskLevel = 'Medium';
    }

    return { category, operation, riskLevel };
  }

  static calculateRiskScore(query) {
    let score = 0;
    const upperQuery = query.toUpperCase();

    if (upperQuery.includes('DELETE')) score += 40;
    if (upperQuery.includes('DROP')) score += 50;
    if (upperQuery.includes('TRUNCATE')) score += 45;
    if (upperQuery.includes('ALTER')) score += 35;
    if (upperQuery.includes('UPDATE') && !upperQuery.includes('WHERE')) score += 30;
    if (upperQuery.includes('DELETE') && !upperQuery.includes('WHERE')) score += 40;
    if (upperQuery.includes('GRANT')) score += 25;

    const injectionResult = this.detectSQLInjection(query);
    if (injectionResult.detected) score += 50;

    return Math.min(score, 100);
  }

  static validateQuery(query) {
    const injection = this.detectSQLInjection(query);
    const classification = this.classifyQuery(query);
    const riskScore = this.calculateRiskScore(query);

    let severity;
    if (riskScore >= 80) severity = 'Critical';
    else if (riskScore >= 60) severity = 'High';
    else if (riskScore >= 40) severity = 'Medium';
    else severity = 'Low';

    return {
      secure: !injection.detected,
      injection,
      classification,
      riskScore,
      severity
    };
  }
}

module.exports = SecurityLayer;
