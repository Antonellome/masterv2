# Configurazione per un progetto React con Vite
{ pkgs, ... }: {
  # Canale stabile dei pacchetti Nix
  channel = "stable-24.05";

  # Pacchetti di sistema richiesti
  packages = [
    pkgs.nodejs_20
  ];

  # Variabili d'ambiente per l'intero workspace.
  # La variabile WORKSPACE_SLUG e' fondamentale per l'integrazione con Firebase.
  env = {
    WORKSPACE_SLUG = "riso-m-o-v3";
  };

  idx = {
    # Estensioni di VS Code per la qualità del codice
    extensions = [
      "dbaeumer.vscode-eslint"
      "esbenp.prettier-vscode"
    ];

    # Anteprima dell'applicazione web
    previews = {
      enable = true;
      previews = {
        web = {
          # Comando per avviare il server di sviluppo Vite
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0"];
          manager = "web";
        };
      };
    };

    # Comandi da eseguire al ciclo di vita dell'ambiente
    workspace = {
      # All'avvio, installa le dipendenze SOLO se la cartella node_modules non esiste.
      # Questo rende i riavvii successivi molto più veloci.
      onStart = {
        npm-install = "if [ ! -d 'node_modules' ]; then npm install; fi";
      };
    };
  };
}
