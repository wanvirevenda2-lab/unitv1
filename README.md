# UniTV — projeto Android-ready (tema vermelho)

Este pacote contém o projeto web UniTV e a configuração para empacotar como aplicativo Android usando Capacitor. O APK binário ainda precisa ser gerado com Android Studio/SDK.

## Requisitos
- Node.js 18+
- Android Studio instalado com Android SDK
- JDK compatível com a versão do Android Gradle Plugin instalada pelo Capacitor

## Criar o projeto Android
Abra um terminal nesta pasta e execute:

```bash
npm install
npx cap add android
npm run android:sync
npx cap open android
```

No Android Studio:
1. Aguarde o Gradle terminar a sincronização.
2. Para testar, conecte um Android/TV Box ou use um emulador e clique em Run.
3. Para gerar APK de teste, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
4. O Android Studio mostrará o local do APK gerado.

## O que funciona neste ponto
- Interface responsiva em vermelho e preto
- Importação de arquivo M3U/M3U8
- Tentativa de carregar listas M3U por URL
- Busca e filtros por categoria
- Reprodução HLS em navegadores/dispositivos compatíveis

## Limitações atuais
- Este pacote é Android-ready, mas não inclui um APK já compilado.
- Xtream Codes (servidor, usuário e senha) ainda não foi implementado.
- Algumas listas bloqueiam chamadas por CORS ou precisam de configurações específicas do servidor.
- Não inclui canais, filmes, séries ou credenciais. Use conteúdo autorizado.
- Em TV Box, a navegação por controle remoto e o comportamento de cada player precisam ser testados no dispositivo real.

## Publicar na web
```bash
npm install
npm run build
```
A pasta `dist` é a pasta de publicação.
