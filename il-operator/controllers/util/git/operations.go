package git

import (
	"errors"
	"fmt"
	"github.com/compuzest/zlifecycle-il-operator/controllers/util/common"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	gogit "github.com/go-git/go-git/v5"
)

type CleanupFunc func()

func PullOrClone(gitAPI API, repoURL string) error {
	tempPath := os.TempDir()
	repoPath := filepath.Join(tempPath, repoURL)
	err := gitAPI.Open(repoURL)
	if errors.Is(err, gogit.ErrRepositoryNotExists) {
		if err := gitAPI.Clone(repoURL, repoPath); err != nil {
			return err
		}
		return nil
	}
	if err != nil {
		return err
	}

	return nil
}

func CloneTemp(gitAPI API, repo string) (dir string, cleanup CleanupFunc, err error) {
	httpsPrefix := "https://github.com/"
	httpsRepo := common.RewriteGitURLToHTTPS(repo)
	dirName := strings.ReplaceAll(strings.TrimPrefix(strings.TrimSuffix(httpsRepo, ".git"), httpsPrefix), "/", "-")
	tempDir, err := ioutil.TempDir("", fmt.Sprintf("repo-%s-", dirName))
	if err != nil {
		return "", nil, err
	}

	if err := gitAPI.Clone(httpsRepo, tempDir); err != nil {
		return "", nil, err
	}

	cleanupFunc := func() {
		_ = os.RemoveAll(tempDir)
	}

	return tempDir, cleanupFunc, nil
}
