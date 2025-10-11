<?php require_once 'db.php'; ?>
<!DOCTYPE html>
<?php
require_once 'db.php';

// Получаем всех клиентов
$result = $conn->query("SELECT id, first_name, last_name FROM customers");
?>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Добавление клиента и устройства</title>
</head>
<body>

  <h2>Добавить клиента</h2>
  <form action="add_customer.php" method="post">
  <label>Имя:</label>
  <input type="text" name="first_name" required>

  <label>Фамилия:</label>
  <input type="text" name="last_name" required>

  <label>Телефон:</label>
  <input type="text" name="phone" required>

  <button type="submit">Добавить клиента</button>
</form>

    <h2>Добавить устройство</h2>
    <form action="add_device.php" method="post">
  <label>Название устройства:</label>
  <input type="text" name="device_name" required>

  <label>IMEI:</label>
  <input type="text" name="imei">

  <label>Неисправность:</label>
  <select name="issue">
    <option value="Экран не работает">Экран не работает</option>
    <option value="Не заряжается">Не заряжается</option>
    <option value="Не включается">Не включается</option>
    <option value="Звуковые проблемы">Звуковые проблемы</option>
    <!-- добавь свои варианты -->
  </select>

  <label>Статус:</label>
  <select name="status">
    <option value="В ожидании">В ожидании</option>
    <option value="В ремонте">В ремонте</option>
    <option value="Готово">Готово</option>
  </select>

  <label>Выберите клиента:</label>
  <select name="customer_id" required>
    <?php while($row = $result->fetch_assoc()) {
      echo "<option value='{$row['id']}'>{$row['first_name']} {$row['last_name']}</option>";
    } ?>
  </select>

  <button type="submit">Добавить устройство</button>
</form>

</body>
</html>
