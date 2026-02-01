{ pkgs, ... }: {
  # CAMBIA DA "stable-24.05" A "stable-24.11"
  # Questo è il cuore del problema. Senza questo, resterai sempre alla v22.10.
  channel = "stable-24.11";

  packages = [
    pkgs.nodejs_22
  ];

  idx = {
    extensions = [
      "astro-build.astro-vscode"
      "csstools.postcss"
      "bradlc.vscode-tailwindcss"
    ];

    previews = {
      enable = true;
      previews = {
        web = {
          command = [ "npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0" ];
          manager = "web";
        };
      };
    };

    workspace = {
      onCreate = {
        # Rimuoviamo i vecchi moduli per sicurezza
        install-dependencies = "rm -rf node_modules && npm install";
      };
    };
  };
}