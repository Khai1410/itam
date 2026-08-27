// Shared [field, header] column list used by both Excel/CSV export and Excel import,
// so a file exported from this app can be edited and re-imported directly.
const COLUMNS = [
  ['no', 'No'], ['device_name', 'Device Name'], ['condition', 'Condition'],
  ['business_unit', 'Business Unit'], ['job_family', 'Job Family'], ['project', 'Project'],
  ['location', 'Location'], ['label', 'Label'], ['old_label', 'Old Label'], ['brand', 'Brand'],
  ['description', 'Description'], ['chip', 'Chip'], ['storage', 'Storage'],
  ['license_win11', 'License Win 11 Pro'], ['serial_number', 'Serial Number'],
  ['purchase_date', 'Purchase Date'], ['vendor', 'Vendor'], ['price', 'Price'],
  ['employee_name', 'Employee Name'], ['employee_dept', 'Employee Dept'],
  ['line_manager', 'Line Manager'], ['note', 'Note'],
];

module.exports = { COLUMNS };
