const bcrypt = require('bcryptjs');
const password = '1234567890';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Erreur:', err);
    return;
  }
  console.log('Mot de passe:', password);
  console.log('Hash bcrypt:', hash);
  console.log('');
  console.log('UPDATE USER SET mot_de_passe_hash = "' + hash + '" WHERE email = "omeongaandre2@gmail.com";');
});
