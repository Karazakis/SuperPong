name = SuperPong
env_file = ./srcs/.env

all: check-env
	@printf "Launch configuration ${name}...\n"
	@docker-compose --env-file $(env_file) -f ./srcs/docker-compose.yml up -d

build: check-env
	@printf "Building configuration ${name}...\n"
	@docker-compose --env-file $(env_file) -f ./srcs/docker-compose.yml up -d --build
	@make portainer

portainer:
	@printf "Launching Portainer...\n"
	@sudo docker run -d -p 9443:9443 --name portainer --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce:2.11.1 || true

down:
	@printf "Stopping configuration ${name}...\n"
	@docker-compose --env-file $(env_file) -f ./srcs/docker-compose.yml down

re: check-env
	@printf "Rebuild configuration ${name}...\n"
	@docker-compose --env-file $(env_file) -f ./srcs/docker-compose.yml up -d --build

clean: down
	@printf "Cleaning configuration ${name}...\n"
	@docker volume rm $$(docker volume ls -q) || true

fclean:
	@printf "Total clean of all configurations docker\n"
	@docker stop $$(docker ps -qa) || true
	@docker system prune --all --force --volumes
	@docker network prune --force
	@docker volume rm $$(docker volume ls -q) || true

check-env:
	@if [ ! -f $(env_file) ]; then \
		printf "Error: .env file not found at $(env_file). Please create it before proceeding.\n"; \
		exit 1; \
	fi

.PHONY: all build down re clean fclean portainer check-env
