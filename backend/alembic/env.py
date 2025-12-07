import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the project root to the python path
sys.path.append(os.getcwd())

# Import Base and models
from app.db.base_class import Base
from app.models import *  # noqa
from app.core.config import settings

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.

def get_url():
    return settings.DATABASE_URL

def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and name in [
        "spatial_ref_sys", "topology", "layer", "tiger_data", "edges", "faces", "nodes", 
        "relation", "node", "way", "way_nodes", "relation_members", "street_type_lookup",
        "loader_lookuptables", "loader_platform", "loader_variables", "pagc_gaz", "pagc_lex",
        "pagc_rules", "place", "place_lookup", "secondary_unit_lookup", "state", "state_lookup",
        "street_type_lookup", "tabblock", "tabblock20", "tract", "zcta5", "zip_lookup",
        "zip_lookup_all", "zip_lookup_base", "zip_state", "zip_state_loc", "addr", "addrfeat",
        "bg", "county", "county_lookup", "countysub_lookup", "cousub", "direction_lookup",
        "featnames", "geocode_settings", "geocode_settings_default"
    ]:
        return False
    return True

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = get_url()
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            include_object=include_object
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
