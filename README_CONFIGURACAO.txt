PROGRAMA DE VENDAS - FESTA JUNINA SESI / FESTIVAL DE PARINTINS
===============================================================

ARQUIVOS DO SISTEMA
-------------------
- index.html
- styles.css
- app.js
- firebase-config.js
- pasta img/

LOGIN PADRÃO
------------
Admin: admin / 1234
Vendedor: vendedor / 123

IMPORTANTE: esses logins ficam no arquivo app.js. Para trocar as senhas, abra app.js e altere:
const USERS = { ... }

O QUE O SISTEMA FAZ
-------------------
- Roda online pelo GitHub Pages.
- Funciona em computador, celular e tablet.
- Salva produtos e vendas no Firebase Firestore.
- Todos os aparelhos usam o mesmo histórico.
- Vendedor registra vendas.
- Admin registra vendas, cadastra/edita/exclui produtos, exporta CSV e apaga histórico.

PASSO 1 - CRIAR PROJETO NO FIREBASE
-----------------------------------
1. Acesse: https://console.firebase.google.com/
2. Clique em "Adicionar projeto".
3. Nome sugerido: festa-junina-sesi
4. Pode desativar Google Analytics, se quiser.
5. Finalize a criação.

PASSO 2 - CRIAR BANCO FIRESTORE
-------------------------------
1. No menu lateral do Firebase, clique em "Firestore Database".
2. Clique em "Criar banco de dados".
3. Escolha "Modo de produção" ou "Modo de teste".
4. Escolha a região mais próxima, por exemplo: southamerica-east1, se disponível.
5. Finalize.

PASSO 3 - CONFIGURAR AS REGRAS DO FIRESTORE
-------------------------------------------
Para teste rápido da festa, use estas regras em Firestore Database > Regras:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

Depois clique em PUBLICAR.

ATENÇÃO: essas regras são simples e abertas para facilitar o uso no evento.
Para uso permanente/profissional, o ideal é configurar Firebase Authentication e regras mais seguras.

PASSO 4 - PEGAR A CONFIGURAÇÃO DO FIREBASE
------------------------------------------
1. No Firebase, clique na engrenagem > Configurações do projeto.
2. Desça até "Seus apps".
3. Clique no ícone Web </>.
4. Nome do app: Caixa Festa Junina.
5. Clique em registrar app.
6. Copie o bloco firebaseConfig.
7. Abra o arquivo firebase-config.js deste projeto.
8. Substitua os textos COLE_SUA_API_KEY, COLE_SEU_PROJECT_ID etc pelos dados reais.

Exemplo do arquivo firebase-config.js:

export const firebaseConfig = {
  apiKey: "SUA_CHAVE",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxx"
};

PASSO 5 - TESTAR NO COMPUTADOR
------------------------------
Por usar módulos JavaScript, o ideal é testar com servidor local.
Se você usa VS Code:
1. Instale a extensão Live Server.
2. Clique com o botão direito no index.html.
3. Clique em "Open with Live Server".

PASSO 6 - SUBIR PARA O GITHUB
-----------------------------
1. Acesse https://github.com/
2. Crie um repositório novo, por exemplo: festa-junina-sesi
3. Envie todos os arquivos e a pasta img para o repositório.

PASSO 7 - ATIVAR GITHUB PAGES
-----------------------------
1. No repositório, clique em Settings.
2. Clique em Pages.
3. Em Branch, escolha main.
4. Em pasta, escolha /root.
5. Clique em Save.
6. Aguarde alguns minutos.
7. O GitHub vai gerar um link parecido com:
   https://seuusuario.github.io/festa-junina-sesi/

PASSO 8 - USAR NO TABLET
------------------------
1. Abra o link do GitHub Pages no Chrome do tablet.
2. Faça login como vendedor ou admin.
3. Para fixar como app:
   Chrome > menu de três pontos > Adicionar à tela inicial.

OBSERVAÇÕES IMPORTANTES
-----------------------
- Precisa de internet para salvar vendas no Firebase.
- Todos os dispositivos devem acessar o mesmo link.
- O histórico fica centralizado no Firestore.
- O CSV pode ser baixado pelo admin para conferência posterior.
- Se aparecer alerta de Firebase não configurado, revise o arquivo firebase-config.js.

