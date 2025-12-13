from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="perfume",
            name="all_notes",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="perfume",
            name="character",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="perfume",
            name="collection",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="perfume",
            name="family",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="perfume",
            name="intensity",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="perfume",
            name="name_en",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="perfume",
            name="name_fa",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AddField(
            model_name="perfume",
            name="notes_base",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="perfume",
            name="notes_middle",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="perfume",
            name="notes_top",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AlterField(
            model_name="perfume",
            name="brand",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AlterField(
            model_name="perfume",
            name="name",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        migrations.AlterField(
            model_name="perfume",
            name="season",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
    ]










