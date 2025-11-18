module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  // Exécuter les tests en série pour éviter les conflits sur test.db (SQLite n'a qu'un seul writer)
  maxWorkers: 1,
};
