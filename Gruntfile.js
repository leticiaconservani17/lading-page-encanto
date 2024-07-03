const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Define o caminho do executável ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

module.exports = function(grunt) {

    // Adicione todas as definições e chamadas do 'grunt' dentro desta função
    function getVideoFiles(srcPath) {
        return fs.readdirSync(srcPath).filter(file => {
            return file.endsWith('.mp4'); 
        }).map(file => {
            return path.join(srcPath, file);
        });
    }

    function compileVideos(done) {
        const videoFiles = getVideoFiles('src/videos');
        const outputDir = 'build/videos';

        // Cria o diretório de saída se ele não existir
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const tasks = videoFiles.map(file => {
            const outputFile = path.join(outputDir, path.basename(file));
            return new Promise((resolve, reject) => {
                ffmpeg(file)
                    .outputOptions('-vf', 'scale=1280:720')
                    .on('end', () => resolve())
                    .on('error', err => reject(err))
                    .save(outputFile);
            });
        });

        Promise.all(tasks)
            .then(() => done())
            .catch(err => {
                grunt.log.error(err);
                done(false);
            });
    }

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        sass: {
            development: {
                options: {
                    style: 'expanded'
                },
                files: [{
                    expand: true,
                    cwd: 'src/styles/',
                    src: ['*.scss'],
                    dest: 'dev/styles/',
                    ext: '.css'
                }]
            },
            production: {
                options: {
                    style: 'compressed'
                },
                files: [{
                    expand: true,
                    cwd: 'src/styles/',
                    src: ['*.scss'],
                    dest: 'build/styles/',
                    ext: '.min.css'
                }]
            }
        },
        imagemin: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'src/images/',
                    src: ['**/*.{png,jpg,gif}'],
                    dest: 'build/images/'
                }]
            }
        },
        replace: {
            dev: {
                options: {
                    patterns: [
                        {
                            match: 'ENDERECO_DO_CSS',
                            replacement: './styles/main.css'
                        }
                    ]
                },
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['src/index.html'],
                        dest: 'dev/'
                    }
                ]
            },
            dist: {
                options: {
                    patterns: [
                        {
                            match: 'ENDERECO_DO_CSS',
                            replacement: './styles/main.min.css'
                        }
                    ]
                },
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['src/index.html'],
                        dest: 'build/'
                    }
                ]
            }
        },
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: {
                    'prebuild/index.html': 'src/index.html'
                }
            }
        },
        watch: {
            sass: {
                files: ['src/styles/**/*.scss'],
                tasks: ['sass'],
                options: {
                    livereload: true,
                }
            },
            imagemin: {
                files: ['src/images/**/*.{png,jpg,gif}'],
                tasks: ['imagemin:dist'],
                options: {
                    spawn: false,
                    livereload: true,
                }
            },
            html: {
                files: ['src/index.html'],
                tasks: ['htmlmin', 'replace'],
                options: {
                    livereload: true,
                },
            },
            videos: {
                files: ['src/videos/*'],
                tasks: ['compileVideos'],
                options: {
                    livereload: true,
                },
            }
        },
        concurrent: {
            target: ['sass', 'imagemin:dist', 'htmlmin', 'replace', 'compileVideos']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-htmlmin');

    // Tarefa personalizada para compilar vídeos
    grunt.registerTask('compileVideos', 'Compile video files', function() {
        const done = this.async();
        compileVideos(done);
    });

    grunt.registerTask('default', ['watch']);
    grunt.registerTask('build', ['concurrent:target']);
};

