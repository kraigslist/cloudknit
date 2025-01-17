package v1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type Repo struct {
	Source string `json:"source"`
	Path   string `json:"path"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status

// Team is the Schema for the teams API.
type Team struct {
	metav1.TypeMeta   `json:",inline"`
	metav1.ObjectMeta `json:"metadata,omitempty"`

	Spec   TeamSpec   `json:"spec,omitempty"`
	Status TeamStatus `json:"status,omitempty"`
}

// TeamSpec defines the desired state of Team.
type TeamSpec struct {
	TeamName    string   `json:"teamName"`
	ConfigRepo  *Repo    `json:"configRepo"`
	Permissions []string `json:"permissions,omitempty"`
}

// TeamStatus defines the observed state of Team.
type TeamStatus struct { // INSERT ADDITIONAL STATUS FIELD - define observed state of cluster
	// Important: Run "make" to regenerate code after modifying this file
}

// +kubebuilder:object:root=true

// TeamList contains a list of Team.
type TeamList struct {
	metav1.TypeMeta `json:",inline"`
	metav1.ListMeta `json:"metadata,omitempty"`
	Items           []Team `json:"items"`
}

// nolint
func init() {
	SchemeBuilder.Register(&Team{}, &TeamList{})
}
