exports.up = async function (knex) {
  await knex.schema.createTable('asset_assignment_history', (t) => {
    t.increments('id').primary();
    t.integer('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    t.string('employee_name').notNullable();
    t.string('employee_account');
    t.timestamp('assigned_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('unassigned_at');
    t.string('handled_by'); // username of the admin who made the change
    t.index(['asset_id']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('asset_assignment_history');
};
