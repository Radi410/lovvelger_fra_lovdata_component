Sørg for å ha Node.js installert!
Det er to terminaler som må opp, en proxy for å hente ut dataen og en for selve komponentet. Fant ikke nødvendigheten å bruke docker siden fremgangsmåten er ganske rett fram.

Kjør prosjektet nå:
1. Åpne første terminal (PowerShell eller CMD):
bashcd C:\Github\lovvelger_fra_lovdata_component\Lovdata_component\min-lovvelger
npm install
npm run dev
```

Vent til du ser:
```
Lovdata proxy server running at http://localhost:3001
La denne terminalen stå åpen!



2. Åpne ny terminal (PowerShell eller CMD):
bashcd C:\Github\lovvelger_fra_lovdata_component\Lovdata_component\proxy
npm install
npm run dev
```

Vent til du ser:
```
 
 Ready in X.Xs
- Local: http://localhost:3000
La denne terminalen også stå åpen!
3. Åpne nettleseren:
Gå til http://localhost:3000
