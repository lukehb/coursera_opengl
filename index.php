<?php

<?php
$d = dir("code");
echo "Path: " . $d->path . "\n";
echo "<ul>";
while (false !== ($entry = $d->read())) {
   echo "<li><a href='{$entry}'>{$entry}</a></li>";
}
echo "</ul>";
$d->close();
?>

?>