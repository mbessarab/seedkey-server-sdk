export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🔐 SeedKey Next.js Example</h1>
      <p>This is an example of SeedKey authentication with Next.js App Router.</p>
      
      <h2>API Routes</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #333' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Method</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Endpoint</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>POST</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/auth/challenge</code></td>
            <td style={{ padding: '0.5rem' }}>Create authentication challenge</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>POST</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/auth/register</code></td>
            <td style={{ padding: '0.5rem' }}>Register new user</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>POST</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/auth/verify</code></td>
            <td style={{ padding: '0.5rem' }}>Verify signature & login</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>POST</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/auth/logout</code></td>
            <td style={{ padding: '0.5rem' }}>Invalidate session</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>POST</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/auth/refresh</code></td>
            <td style={{ padding: '0.5rem' }}>Refresh access token</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>GET</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/auth/me</code></td>
            <td style={{ padding: '0.5rem' }}>Get current user info</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>GET</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/keys</code></td>
            <td style={{ padding: '0.5rem' }}>List user public keys</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>POST</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/keys</code></td>
            <td style={{ padding: '0.5rem' }}>Add new public key</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #ddd' }}>
            <td style={{ padding: '0.5rem' }}><code>DELETE</code></td>
            <td style={{ padding: '0.5rem' }}><code>/api/v1/keys/[keyId]</code></td>
            <td style={{ padding: '0.5rem' }}>Remove public key</td>
          </tr>
        </tbody>
      </table>

      <h2>Example Request</h2>
      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`# Create challenge for registration
curl -X POST http://localhost:3000/api/v1/auth/challenge \\
  -H "Content-Type: application/json" \\
  -d '{"publicKey": "your-base64-public-key", "action": "register"}'

# Register with signed challenge
curl -X POST http://localhost:3000/api/v1/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "publicKey": "your-base64-public-key",
    "challenge": {...},
    "signature": "base64-signature"
  }'

# Get current user (authenticated)
curl http://localhost:3000/api/v1/auth/me \\
  -H "Authorization: Bearer <access-token>"`}
      </pre>
    </main>
  );
}
