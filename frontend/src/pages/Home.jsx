import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

// Skeleton Loader Component
const SkeletonLoader = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded mb-2 w-full"></div>
    <div className="h-4 bg-gray-200 rounded mb-2 w-5/6"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
  </div>
);

// Chat Message Component (memoized)
const ChatMessage = ({ message }) => (
  <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[80%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] px-4 py-3 rounded-lg shadow-sm ${
      message.role === 'user' 
        ? 'bg-blue-600 text-white rounded-br-sm' 
        : 'bg-white text-gray-800 rounded-bl-sm'
    }`}>
      <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
    </div>
  </div>
);

const Home = () => {
  const [mode, setMode] = useState('demo');
  const [demoDatabases, setDemoDatabases] = useState([]);
  const [selectedDemoDb, setSelectedDemoDb] = useState(null);
  const [schemaSQL, setSchemaSQL] = useState('');
  const [schemaFile, setSchemaFile] = useState(null);
  const [schema, setSchema] = useState(null);
  const [dbDetails, setDbDetails] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState(null);
  const [selectedQueryIndex, setSelectedQueryIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [documentation, setDocumentation] = useState(null);
  const [health, setHealth] = useState(null);
  const [history, setHistory] = useState([]);
  const [targetDb, setTargetDb] = useState('postgresql');
  const [translatedSQL, setTranslatedSQL] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [dbType, setDbType] = useState('mysql');
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbName, setDbName] = useState('');
  const [dbUser, setDbUser] = useState('root');
  const [dbPassword, setDbPassword] = useState('');
  const [dbPath, setDbPath] = useState('');

  // Memoized value
  const selectedQuery = useMemo(() => result?.queries?.[selectedQueryIndex], [result, selectedQueryIndex]);

  const resetSession = useCallback(() => {
    setSessionActive(false);
    setSchema(null);
    setDbDetails(null);
    setResult(null);
    setDocumentation(null);
    setHealth(null);
    setChatMessages([]);
    setChatInput('');
    setPrompt('');
    setTranslatedSQL(null);
    setSelectedQueryIndex(0);
    setActiveTab('chat');
    setSchemaSQL('');
    setSchemaFile(null);
  }, []);

  const handleHeaderBack = useCallback(() => {
    if (sessionActive) {
      resetSession();
      return;
    }

    setMode('demo');
    setSchema(null);
    setDbDetails(null);
    setResult(null);
    setDocumentation(null);
    setHealth(null);
    setChatMessages([]);
    setChatInput('');
    setPrompt('');
    setTranslatedSQL(null);
    setSelectedQueryIndex(0);
    setActiveTab('chat');
  }, [resetSession, sessionActive]);

  // Load demo databases
  const fetchDemoDbs = useCallback(async () => {
    try {
      const response = await axios.get('/api/demo-databases');
      setDemoDatabases(response.data.databases);
    } catch (error) {
      console.error('Error loading demo databases:', error);
    }
  }, []);

  // Load query history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get('/api/history');
      setHistory(response.data.history);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }, []);

  useEffect(() => {
    fetchDemoDbs();
    fetchHistory();
  }, [fetchDemoDbs, fetchHistory]);

  const loadDemoDatabase = useCallback(async (dbId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/demo-database/${dbId}`);
      setSchema(response.data.schema);
      setDbDetails(response.data);
      setSelectedDemoDb(dbId);
      setSessionActive(true);
      setChatMessages([]);
      setResult(null);
      setDocumentation(null);
      setHealth(null);
    } catch (error) {
      alert('Error loading demo database: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const parseSchema = useCallback(async () => {
    try {
      setAnalyzing(true);
      
      if (!schemaSQL && !schemaFile) {
        alert('Please upload a schema file, paste schema content, upload table metadata, or upload an ER diagram before connecting.');
        setAnalyzing(false);
        return;
      }

      const formData = new FormData();
      if (schemaSQL) {
        formData.append('sql', schemaSQL);
      }
      if (schemaFile) {
        formData.append('schemaFile', schemaFile);
      }

      const response = await axios.post('/api/parse-schema', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSchema(response.data.schema);
      setDbDetails(response.data);
      setSessionActive(true);
      setChatMessages([]);
      setResult(null);
      setDocumentation(null);
      setHealth(null);
    } catch (error) {
      alert('Error parsing schema: ' + (error.response?.data?.error || error.message));
    } finally {
      setAnalyzing(false);
    }
  }, [schemaSQL, schemaFile]);

  const connectLiveDatabase = useCallback(async () => {
    try {
      setAnalyzing(true);
      
      let config;
      if (dbType === 'sqlite') {
        if (!dbPath) {
          alert('Please specify SQLite database path');
          setAnalyzing(false);
          return;
        }
        config = { path: dbPath };
      } else {
        if (!dbHost || !dbPort || !dbName || !dbUser) {
          alert('Please fill in all database connection details');
          setAnalyzing(false);
          return;
        }
        config = {
          host: dbHost,
          port: parseInt(dbPort),
          database: dbName,
          user: dbUser,
          password: dbPassword
        };
      }

      const response = await axios.post('/api/schema', {
        dbType,
        config
      });
      
      setSchema(response.data.schema);
      setDbDetails(response.data);
      setSessionActive(true);
      setChatMessages([]);
      setResult(null);
      setDocumentation(null);
      setHealth(null);
    } catch (error) {
      alert('Error connecting to database: ' + (error.response?.data?.error || error.message));
    } finally {
      setAnalyzing(false);
    }
  }, [dbType, dbHost, dbPort, dbName, dbUser, dbPassword, dbPath]);

  const generateQueries = useCallback(async () => {
    if (!schema) {
      alert('Please select a database or upload a schema first');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/generate', {
        prompt,
        schema,
        dbType: 'mysql'
      });
      setResult(response.data);
      setSelectedQueryIndex(0);
      // Refresh history
      const historyResponse = await axios.get('/api/history');
      setHistory(historyResponse.data.history);
    } catch (error) {
      alert('Error generating queries: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [prompt, schema]);

  const generateDocumentation = useCallback(async () => {
    if (!schema) {
      alert('Please select a database or upload a schema first');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/document', { schema });
      setDocumentation(response.data.documentation);
    } catch (error) {
      alert('Error generating documentation: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [schema]);

  const analyzeHealth = useCallback(async () => {
    if (!schema) {
      alert('Please select a database or upload a schema first');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/analyze-health', { schema });
      setHealth(response.data.health);
    } catch (error) {
      alert('Error analyzing database health: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [schema]);

  const translateQuery = useCallback(async () => {
    if (!result || !result.queries) {
      alert('Please generate a query first');
      return;
    }
    try {
      setLoading(true);
      const response = await axios.post('/api/translate', {
        sql: result.queries[selectedQueryIndex].sql,
        sourceDb: 'mysql',
        targetDb
      });
      setTranslatedSQL(response.data.sql);
    } catch (error) {
      alert('Error translating query: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [result, selectedQueryIndex, targetDb]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim()) return;
    
    try {
      setChatLoading(true);
      const response = await axios.post('/api/chat', {
        prompt: chatInput,
        messages: chatMessages
      });
      setChatMessages(response.data.chatHistory);
      setChatInput('');
    } catch (error) {
      alert('Error in chat: ' + (error.response?.data?.error || error.message));
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatMessages]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  }, [sendChatMessage]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 md:py-6 px-4">
        <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">GenAI Database Copilot</h1>
            <p className="text-blue-100 mt-1 md:mt-2 text-xs md:text-sm">
              AI-Powered Database Assistant - Secure, Explainable, Optimized
            </p>
          </div>
          {sessionActive && (
            <button
              onClick={handleHeaderBack}
              className="inline-flex items-center justify-center rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition"
            >
              ← Back to Modes
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8">
        {!sessionActive ? (
          <>
            <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Select Mode</h2>
              <div className="flex flex-wrap gap-2 md:gap-4">
                <button
                  onClick={() => { setMode('demo'); setSessionActive(false); setSchema(null); setDbDetails(null); setResult(null); }}
                  className={`px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium text-sm md:text-base ${
                    mode === 'demo' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🎮 Demo Mode
                </button>
                <button
                  onClick={() => { setMode('upload'); setSessionActive(false); setSchema(null); setDbDetails(null); setResult(null); }}
                  className={`px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium text-sm md:text-base ${
                    mode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📤 Upload Schema
                </button>
                <button
                  onClick={() => { setMode('connect'); setSessionActive(false); setSchema(null); setDbDetails(null); setResult(null); }}
                  className={`px-4 py-2 md:px-6 md:py-3 rounded-lg font-medium text-sm md:text-base ${
                    mode === 'connect' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  🔌 Connect to DB
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
              <div className="space-y-4 md:space-y-6 lg:col-span-1">
                {mode === 'demo' && (
                  <div className="bg-white rounded-lg shadow p-4 md:p-6">
                    <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Demo Databases</h2>
                    {demoDatabases.length === 0 ? (
                      <SkeletonLoader />
                    ) : (
                      <div className="space-y-2 md:space-y-3">
                        {demoDatabases.map(db => (
                          <button
                            key={db.id}
                            onClick={() => loadDemoDatabase(db.id)}
                            className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-lg border text-sm md:text-base ${
                              selectedDemoDb === db.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {db.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {mode === 'upload' && (
                  <div className="bg-white rounded-lg shadow p-4 md:p-6 space-y-3 md:space-y-4">
                    <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Database Understanding</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Paste Schema SQL</label>
                      <textarea
                        value={schemaSQL}
                        onChange={(e) => setSchemaSQL(e.target.value)}
                        placeholder="Paste your CREATE TABLE statements here..."
                        className="w-full h-32 md:h-48 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Schema File</label>
                      <input
                        type="file"
                        accept=".sql,.ddl,.txt,.json"
                        onChange={(e) => setSchemaFile(e.target.files[0])}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>

                    <button
                      onClick={parseSchema}
                      disabled={analyzing}
                      className="w-full bg-purple-600 text-white py-2 md:py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {analyzing ? '🔍 Analyzing Database Structure...' : '🔌 Connect Database'}
                    </button>
                  </div>
                )}

                {mode === 'connect' && (
                  <div className="bg-white rounded-lg shadow p-4 md:p-6 space-y-3 md:space-y-4">
                    <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Connect to Live Database</h2>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
                      <select
                        value={dbType}
                        onChange={(e) => {
                          setDbType(e.target.value);
                          if (e.target.value === 'mysql') setDbPort('3306');
                          if (e.target.value === 'postgresql') setDbPort('5432');
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="mysql">MySQL</option>
                        <option value="postgresql">PostgreSQL</option>
                        <option value="sqlite">SQLite</option>
                      </select>
                    </div>

                    {dbType !== 'sqlite' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                          <input
                            type="text"
                            value={dbHost}
                            onChange={(e) => setDbHost(e.target.value)}
                            placeholder="localhost"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                          <input
                            type="number"
                            value={dbPort}
                            onChange={(e) => setDbPort(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Database Name</label>
                          <input
                            type="text"
                            value={dbName}
                            onChange={(e) => setDbName(e.target.value)}
                            placeholder="mydatabase"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                          <input
                            type="text"
                            value={dbUser}
                            onChange={(e) => setDbUser(e.target.value)}
                            placeholder="root"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                          <input
                            type="password"
                            value={dbPassword}
                            onChange={(e) => setDbPassword(e.target.value)}
                            placeholder="password"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Database File Path</label>
                        <input
                          type="text"
                          value={dbPath}
                          onChange={(e) => setDbPath(e.target.value)}
                          placeholder="/path/to/database.db"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    )}

                    <button
                      onClick={connectLiveDatabase}
                      disabled={analyzing}
                      className="w-full bg-purple-600 text-white py-2 md:py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                    >
                      {analyzing ? '🔍 Connecting and Analyzing...' : '🔌 Connect to Database'}
                    </button>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center">
                  <div className="text-5xl md:text-6xl mb-3 md:mb-4">🤖</div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-700 mb-2">Welcome to GenAI Database Copilot!</h2>
                  <p className="text-gray-500 mb-4 md:mb-6 text-sm md:text-base">
                    Select a demo database, upload a schema, or connect to your database to get started
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
                    <div className="p-3 md:p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl md:text-3xl mb-2">🔒</div>
                      <p className="font-medium text-sm md:text-base">Security First</p>
                      <p className="text-xs md:text-sm text-gray-500">SQL injection detection & risk scoring</p>
                    </div>
                    <div className="p-3 md:p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl md:text-3xl mb-2">✨</div>
                      <p className="font-medium text-sm md:text-base">Explainable AI</p>
                      <p className="text-xs md:text-sm text-gray-500">Understand what queries do</p>
                    </div>
                    <div className="p-3 md:p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl md:text-3xl mb-2">🚀</div>
                      <p className="font-medium text-sm md:text-base">Optimized Queries</p>
                      <p className="text-xs md:text-sm text-gray-500">Get the best performing SQL</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="space-y-4 md:space-y-6 lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
                  <h2 className="text-lg md:text-xl font-semibold">Session Dashboard</h2>
                  <button
                    onClick={resetSession}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                  >
                    ← Back to Modes
                  </button>
                </div>
                <button
                  onClick={resetSession}
                  className="mb-3 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  ← Back to Modes
                </button>
                <div className="space-y-3 md:space-y-4">
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="p-2 md:p-3 bg-blue-50 rounded-lg text-center">
                      <div className="text-xl md:text-2xl font-bold text-blue-600">{dbDetails?.tableCount || 0}</div>
                      <div className="text-xs text-gray-600">Tables</div>
                    </div>
                    <div className="p-2 md:p-3 bg-green-50 rounded-lg text-center">
                      <div className="text-xl md:text-2xl font-bold text-green-600">{dbDetails?.columnCount || 0}</div>
                      <div className="text-xs text-gray-600">Columns</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    <div className="p-2 md:p-3 bg-yellow-50 rounded-lg text-center">
                      <div className="text-xl md:text-2xl font-bold text-yellow-600">{dbDetails?.primaryKeys || 0}</div>
                      <div className="text-xs text-gray-600">Primary Keys</div>
                    </div>
                    <div className="p-2 md:p-3 bg-purple-50 rounded-lg text-center">
                      <div className="text-xl md:text-2xl font-bold text-purple-600">{dbDetails?.foreignKeys || 0}</div>
                      <div className="text-xs text-gray-600">Foreign Keys</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Database Schema</h2>
                <div className="max-h-64 md:max-h-96 overflow-y-auto">
                  {Object.entries(schema || {}).map(([table, data]) => (
                    <div key={table} className="mb-3 md:mb-4 p-2 md:p-4 bg-gray-50 rounded">
                      <h3 className="font-semibold text-blue-600 text-sm md:text-base">{table}</h3>
                      <ul className="mt-2 space-y-1">
                        {data.columns?.map((col) => (
                          <li key={col.name} className="text-xs md:text-sm text-gray-600">
                            {col.name} <span className="text-gray-400">({col.type})</span>
                            {col.primaryKey && <span className="ml-2 text-xs bg-yellow-200 px-1 rounded">PK</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {history.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Query History</h2>
                  <div className="max-h-48 md:max-h-64 overflow-y-auto space-y-2 md:space-y-3">
                    {history.slice(-5).reverse().map((item, idx) => (
                      <div key={idx} className="p-2 md:p-3 bg-gray-50 rounded text-xs md:text-sm">
                        <p className="font-medium truncate">{item.prompt}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {item.queryType} • Risk: {item.riskScore} • {new Date(item.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-3 space-y-4 md:space-y-6">
              {dbDetails?.suggestedPrompts?.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">💡 Suggested Prompts</h2>
                  <div className="flex flex-wrap gap-2">
                    {dbDetails.suggestedPrompts.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setChatInput(suggestion);
                          setActiveTab('chat');
                        }}
                        className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-50 text-blue-700 rounded-lg text-xs md:text-sm hover:bg-blue-100 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex flex-wrap gap-2 md:gap-4 border-b mb-3 md:mb-4">
                  <button
                    onClick={() => setActiveTab('chat')}
                    className={`pb-2 md:pb-3 px-3 md:px-4 font-medium text-sm md:text-base ${
                      activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => setActiveTab('generate')}
                    className={`pb-2 md:pb-3 px-3 md:px-4 font-medium text-sm md:text-base ${
                      activeTab === 'generate' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🛠️ Generate SQL
                  </button>
                  <button
                    onClick={() => setActiveTab('document')}
                    className={`pb-2 md:pb-3 px-3 md:px-4 font-medium text-sm md:text-base ${
                      activeTab === 'document' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    📚 Documentation
                  </button>
                  <button
                    onClick={() => setActiveTab('health')}
                    className={`pb-2 md:pb-3 px-3 md:px-4 font-medium text-sm md:text-base ${
                      activeTab === 'health' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    🩺 Health Check
                  </button>
                </div>

                {activeTab === 'chat' && (
                  <div className="space-y-3 md:space-y-4">
                    <div className="h-64 md:h-96 border border-gray-200 rounded-lg p-3 md:p-4 overflow-y-auto bg-gray-50">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-12 md:mt-20">
                          <div className="text-3xl md:text-4xl mb-2">💬</div>
                          <p className="text-base md:text-lg font-medium">Database Analysis Complete</p>
                          <p className="text-sm md:text-base mt-2">You can now ask questions about your database.</p>
                          <div className="mt-4 text-left max-w-md mx-auto space-y-1 md:space-y-2">
                            <p className="text-xs md:text-sm">• Generate SQL queries</p>
                            <p className="text-xs md:text-sm">• Explain relationships</p>
                            <p className="text-xs md:text-sm">• Optimize queries</p>
                            <p className="text-xs md:text-sm">• Analyze database health</p>
                            <p className="text-xs md:text-sm">• Generate documentation</p>
                            <p className="text-xs md:text-sm">• Convert queries between databases</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 md:space-y-4">
                          {chatMessages.map((msg, idx) => (
                            <ChatMessage key={idx} message={msg} />
                          ))}
                        </div>
                      )}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-800 px-4 py-3 rounded-lg rounded-bl-sm shadow-sm">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask anything about your database..."
                        className="flex-1 px-3 py-2 md:px-4 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={chatLoading}
                        className="px-4 py-2 md:px-6 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm md:text-base"
                      >
                        {chatLoading ? '...' : 'Send'}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'generate' && (
                  <div className="space-y-4 md:space-y-6">
                    <div>
                      <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Natural Language Prompt</h3>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., Show all employees earning more than 50000, or top 10 customers by order value"
                        className="w-full h-32 md:h-48 px-3 py-2 border border-gray-300 rounded-md mb-3 md:mb-4 text-sm md:text-base"
                      />
                      <button
                        onClick={generateQueries}
                        disabled={loading || !prompt}
                        className="w-full bg-purple-600 text-white py-2 md:py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                      >
                        {loading ? 'Generating...' : '✨ Generate SQL Queries'}
                      </button>
                    </div>

                    {result && (
                      <>
                        <div>
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Query Alternatives</h3>
                          <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                            {result.queries.map((query, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedQueryIndex(idx)}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg border text-xs md:text-sm ${
                                  selectedQueryIndex === idx ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="font-medium">{query.approach}</div>
                                <div className="text-xs text-gray-500">
                                  R: {query.readability} • P: {query.performance} • C: {query.complexity}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {selectedQuery && (
                          <>
                            <div className="bg-white rounded-lg shadow p-4 md:p-6">
                              <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Generated SQL</h3>
                              <pre className="bg-gray-900 text-green-400 p-3 md:p-4 rounded-md overflow-x-auto text-xs md:text-sm">
                                {selectedQuery.sql}
                              </pre>
                            </div>

                            <div className="bg-white rounded-lg shadow p-4 md:p-6">
                              <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Translate SQL</h3>
                              <div className="flex flex-wrap gap-2 md:gap-3 mb-2 md:mb-3">
                                <select
                                  value={targetDb}
                                  onChange={(e) => setTargetDb(e.target.value)}
                                  className="px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 rounded-md text-sm md:text-base"
                                >
                                  <option value="mysql">MySQL</option>
                                  <option value="postgresql">PostgreSQL</option>
                                  <option value="sqlite">SQLite</option>
                                  <option value="oracle">Oracle</option>
                                  <option value="sqlserver">SQL Server</option>
                                </select>
                                <button
                                  onClick={translateQuery}
                                  disabled={loading}
                                  className="px-3 py-1.5 md:px-4 md:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm md:text-base"
                                >
                                  {loading ? 'Translating...' : 'Translate'}
                                </button>
                              </div>
                              {translatedSQL && (
                                <pre className="bg-gray-800 text-blue-300 p-3 md:p-4 rounded-md overflow-x-auto text-xs md:text-sm">
                                  {translatedSQL}
                                </pre>
                              )}
                            </div>

                            <div className="bg-white rounded-lg shadow p-4 md:p-6">
                              <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Security Analysis</h3>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                                <div className="p-2 md:p-4 bg-gray-50 rounded">
                                  <p className="text-xs md:text-sm text-gray-500">Category</p>
                                  <p className="font-semibold text-sm md:text-base">{result.security.classification.category}</p>
                                </div>
                                <div className="p-2 md:p-4 bg-gray-50 rounded">
                                  <p className="text-xs md:text-sm text-gray-500">Operation</p>
                                  <p className="font-semibold text-sm md:text-base">{result.security.classification.operation}</p>
                                </div>
                                <div className="p-2 md:p-4 bg-gray-50 rounded">
                                  <p className="text-xs md:text-sm text-gray-500">Risk Level</p>
                                  <p className={`font-semibold text-sm md:text-base ${
                                    result.security.riskScore >= 80 ? 'text-red-600' :
                                    result.security.riskScore >= 60 ? 'text-orange-600' :
                                    result.security.riskScore >= 40 ? 'text-yellow-600' : 'text-green-600'
                                  }`}>
                                    {result.security.severity}
                                  </p>
                                </div>
                                <div className="p-2 md:p-4 bg-gray-50 rounded">
                                  <p className="text-xs md:text-sm text-gray-500">Risk Score</p>
                                  <p className="font-semibold text-sm md:text-base">{result.security.riskScore}/100</p>
                                </div>
                              </div>
                              {result.security.injection.detected && (
                                <div className="mt-3 md:mt-4 p-3 md:p-4 bg-red-100 text-red-700 rounded text-sm md:text-base">
                                  ⚠️ {result.security.injection.message}
                                </div>
                              )}
                            </div>

                            <div className="bg-white rounded-lg shadow p-4 md:p-6">
                              <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Query Explanation</h3>
                              <p className="text-gray-700 whitespace-pre-wrap text-sm md:text-base">{result.explanation}</p>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'document' && (
                  <div className="space-y-4 md:space-y-6">
                    <button
                      onClick={generateDocumentation}
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-2 md:py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                      {loading ? 'Generating...' : '📚 Generate Database Documentation'}
                    </button>

                    {documentation && (
                      <div className="space-y-4 md:space-y-6">
                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Database Summary</h3>
                          <p className="text-gray-700 text-sm md:text-base">{documentation.summary}</p>
                        </div>

                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Business Purpose</h3>
                          <p className="text-gray-700 text-sm md:text-base">{documentation.businessPurpose}</p>
                        </div>

                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                          <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">Tables</h3>
                          <div className="space-y-3 md:space-y-4">
                            {documentation.tables?.map((table, idx) => (
                              <div key={idx} className="p-3 md:p-4 bg-gray-50 rounded">
                                <h4 className="font-semibold text-blue-600 text-sm md:text-base">{table.name}</h4>
                                <p className="text-gray-600 text-xs md:text-sm mt-1">{table.description}</p>
                                <ul className="mt-2 space-y-1">
                                  {table.columns?.map((col, colIdx) => (
                                    <li key={colIdx} className="text-xs md:text-sm text-gray-600">
                                      <span className="font-medium">{col.name}</span> - {col.description}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'health' && (
                  <div className="space-y-4 md:space-y-6">
                    <button
                      onClick={analyzeHealth}
                      disabled={loading}
                      className="w-full bg-red-600 text-white py-2 md:py-3 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                      {loading ? 'Analyzing...' : '🩺 Analyze Database Health'}
                    </button>

                    {health && (
                      <div className="space-y-4 md:space-y-6">
                        <div className="bg-white rounded-lg shadow p-4 md:p-6">
                          <div className="text-center">
                            <div className={`inline-block text-3xl md:text-5xl font-bold mb-2 ${
                              health.healthScore >= 80 ? 'text-green-600' :
                              health.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {health.healthScore}/100
                            </div>
                            <p className="text-base md:text-lg font-semibold">Database Health Score</p>
                            <p className="text-gray-600 mt-2 text-sm md:text-base">{health.summary}</p>
                          </div>
                        </div>

                        {health.missingIndexes?.length > 0 && (
                          <div className="bg-white rounded-lg shadow p-4 md:p-6">
                            <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">⚠️ Missing Indexes</h3>
                            <ul className="space-y-2">
                              {health.missingIndexes.map((idx, i) => (
                                <li key={i} className="p-2 md:p-3 bg-yellow-50 rounded text-gray-700 text-sm md:text-base">{idx}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {health.normalizationIssues?.length > 0 && (
                          <div className="bg-white rounded-lg shadow p-4 md:p-6">
                            <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">🔧 Normalization Issues</h3>
                            <ul className="space-y-2">
                              {health.normalizationIssues.map((issue, i) => (
                                <li key={i} className="p-2 md:p-3 bg-orange-50 rounded text-gray-700 text-sm md:text-base">{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {health.designSuggestions?.length > 0 && (
                          <div className="bg-white rounded-lg shadow p-4 md:p-6">
                            <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">💡 Design Suggestions</h3>
                            <ul className="space-y-2">
                              {health.designSuggestions.map((suggestion, i) => (
                                <li key={i} className="p-2 md:p-3 bg-blue-50 rounded text-gray-700 text-sm md:text-base">{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
