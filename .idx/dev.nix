{
  pkgs, ...
}: {

  packages = [
    pkgs.nodejs_20,
    pkgs.bun
  ];

  idx.previews = [
    {
      name = "master-office";
      command = "npm install && npm run dev -- --port $PORT --host 0.0.0.0";
      manager = "web";
      dir = "apps/master-office";
    },
    {
      name = "app-tecnici";
      command = "bun install && bun run start-web";
      manager = "web";
      dir = "riso-app-tecnici-repo";
    }
  ];

}
