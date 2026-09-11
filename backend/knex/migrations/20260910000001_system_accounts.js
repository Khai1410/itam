exports.up = async function (knex) {
  await knex.schema.createTable('system_accounts', (t) => {
    t.increments('id').primary();
    t.string('system').notNullable();
    t.string('category');
    t.string('url');
    t.string('username');
    t.string('password');
    t.string('permission_role');
    t.string('pic');
    t.text('note');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('system_accounts');
};
