exports.up = async function (knex) {
  await knex.schema.createTable('services', (t) => {
    t.increments('id').primary();
    t.string('service_name').notNullable();
    t.integer('mount');
    t.date('expiration_date'); // null = perpetual / no expiration
    t.text('note');
    t.integer('position');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('services');
};
