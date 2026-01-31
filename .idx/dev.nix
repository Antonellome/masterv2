{
  pkgs, ...
}: {
  # Nix packages to add to the environment
  packages = [ pkgs.nodejs_20 ];

  # web server preview
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = [ "npm" "run" "dev" "--" "--port" "$PORT" "--host" "0.0.0.0" ];
        manager = "web";
      };
    };
  };

  # command to run when the workspace starts
  idx.workspace.onStart = {
    # install dependencies
    install = "npm install";
  };
}
