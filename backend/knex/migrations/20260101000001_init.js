exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('username').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('role').notNullable().defaultTo('viewer'); // 'admin' | 'viewer'
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('employees', (t) => {
    t.increments('id').primary();
    t.string('account').unique();
    t.string('name');
    t.string('job_title');
    t.string('business_unit');
    t.string('job_family');
    t.string('project');
    t.string('line_manager');
    t.string('line_manager_domain');
    t.date('onboard_date');
    t.date('last_date');
    t.string('status');
    t.string('location');
    t.text('note');
    t.index(['name']);
    t.index(['account']);
  });

  await knex.schema.createTable('assets', (t) => {
    t.increments('id').primary();
    t.integer('no');
    t.string('device_name');
    t.string('condition'); // In Use / In Stock / Damaged / Lost / Sold
    t.string('business_unit');
    t.string('job_family');
    t.string('project');
    t.string('location');
    t.string('old_label');
    t.string('label');
    t.string('brand');
    t.text('description');
    t.string('chip');
    t.string('storage');
    t.boolean('intune');
    t.boolean('license_win11');
    t.string('serial_number');
    t.date('purchase_date');
    t.string('vendor');
    t.decimal('price', 14, 2);
    t.string('invoice_number');
    t.date('retrieval_date');
    t.string('retrieval_reason');
    t.string('retriever_name');
    t.string('retriever_id');
    t.string('retriever_job_title');
    t.string('retriever_dept');
    t.string('returner_name');
    t.string('returner_id');
    t.string('returner_job_title');
    t.string('returner_dept');
    t.date('handover_date');
    t.string('handover_staff');
    t.string('handover_staff_id');
    t.string('handover_staff_job_title');
    t.string('handover_staff_dept');
    t.string('employee_name');
    t.string('employee_id');
    t.string('employee_job_title');
    t.string('employee_dept');
    t.string('line_manager');
    t.date('repair_date');
    t.text('repair_details');
    t.text('note');
    t.text('note2');
    t.string('form_no');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());

    t.index(['label']);
    t.index(['serial_number']);
    t.index(['device_name']);
    t.index(['condition']);
    t.index(['location']);
    t.index(['employee_name']);
    t.index(['business_unit']);
  });

  await knex.schema.createTable('file_vault', (t) => {
    t.increments('id').primary();
    t.string('label');
    t.string('recovery_key');
  });

  await knex.schema.createTable('windows_keys', (t) => {
    t.increments('id').primary();
    t.string('label');
    t.string('product_key');
    t.string('os_version');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('windows_keys');
  await knex.schema.dropTableIfExists('file_vault');
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('employees');
  await knex.schema.dropTableIfExists('users');
};
