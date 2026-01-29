FROM php:8.2-apache

# Instalar extensões necessárias
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Habilitar mod_rewrite do Apache
RUN a2enmod rewrite

# Configurar handler PHP
RUN echo '<FilesMatch \.php$>' > /etc/apache2/conf-available/php-handler.conf && \
    echo '    SetHandler application/x-httpd-php' >> /etc/apache2/conf-available/php-handler.conf && \
    echo '</FilesMatch>' >> /etc/apache2/conf-available/php-handler.conf && \
    a2enconf php-handler

# Configurar DocumentRoot e permissões
ENV APACHE_DOCUMENT_ROOT /var/www/html

# Configurar Apache para aceitar .htaccess e processar PHP
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf && \
    sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

RUN echo '<Directory ${APACHE_DOCUMENT_ROOT}>' > /etc/apache2/conf-available/docker-php.conf && \
    echo '    Options Indexes FollowSymLinks' >> /etc/apache2/conf-available/docker-php.conf && \
    echo '    AllowOverride All' >> /etc/apache2/conf-available/docker-php.conf && \
    echo '    Require all granted' >> /etc/apache2/conf-available/docker-php.conf && \
    echo '</Directory>' >> /etc/apache2/conf-available/docker-php.conf && \
    a2enconf docker-php

# Configurar permissões
RUN chown -R www-data:www-data /var/www/html

# Expor porta 80
EXPOSE 80

# Comando para iniciar o Apache
CMD ["apache2-foreground"]
