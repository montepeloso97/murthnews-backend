// File: server/virtual/emailTemplate.js

// ⚠️ IMPORTANTE: Qui devono esserci SOLO 3 argomenti!
function getVerificationEmailHtml(pinCode, nome, planName) {
  
  // Se per qualche motivo planName non arriva, mettiamo un default
  const pianoDaMostrare = planName || "Piano Standard";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
    .header { background-color: #000000; padding: 30px; text-align: center; }
    .logo { color: #ffffff; font-size: 28px; font-weight: bold; letter-spacing: 2px; }
    .content { padding: 40px 30px; text-align: center; color: #333; }
    .pin-box { background-color: #f8f8f8; border: 2px dashed #000; font-size: 32px; font-weight: 900; letter-spacing: 5px; padding: 20px; margin: 30px 0; display: inline-block; border-radius: 8px; }
    .footer { background-color: #111; color: #888; padding: 20px; text-align: center; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">MurthNews</div></div>
    <div class="content">
      <h2>Benvenuto, ${nome}</h2>
      <p>Da oggi fai parte della nostra famiglia.</p>
      
      <p>Hai scelto il piano: <strong>${pianoDaMostrare}</strong></p>
      
      <p>Inserisci questo codice per verificare la tua email:</p>
      
      <div class="pin-box">${pinCode}</div>
      
    </div>
    <div class="footer">&copy; 2025 MurthNews Group</div>
  </div>
</body>
</html>
  `;
}

module.exports = { getVerificationEmailHtml };