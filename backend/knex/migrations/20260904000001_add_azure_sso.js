exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('provider').notNullable().defaultTo('local'); // 'local' | 'azure'
    t.string('azure_oid').unique();
  });
  await knex.schema.alterTable('users', (t) => {
    t.string('password_hash').nullable().alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.dropColumn('provider');
    t.dropColumn('azure_oid');
  });
  await knex.schema.alterTable('users', (t) => {
    t.string('password_hash').notNullable().alter();
  });
};
